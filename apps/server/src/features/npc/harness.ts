import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { Mastra } from '@mastra/core/mastra'
import { RequestContext } from '@mastra/core/request-context'
import { InMemoryStore, type MastraCompositeStore } from '@mastra/core/storage'
import {
  type InteractRequest,
  InteractRequestSchema,
  type InteractResponse,
  type NpcId,
  type QuestEvent,
  ZERO_REWARD,
} from '@saigon/shared'
import type { z } from 'zod'
import { outcomeKind as kind, QuestService, runIntent } from '@/domain/quests'
import { log } from '@/shared'
import { isLiveConfigured, type ServerConfig } from '@/shared/config'
import type { GameDb } from '@/shared/db'
import type { Fetcher } from '@/shared/http'
import { createNpcAgents } from './agents'
import { fallbackLine } from './fallbacks'
import { CostGuard } from './guard'
import { NpcMemoryService } from './memory/npc-memory'
import { clearPlayerThreads, recordGreeting } from './memory/threads'
import { type HarnessUsage, meteredFetch, storageUnavailable } from './meter'
import { languageRule } from './personas/shared'
import { cleanReply } from './safety'
import { ShortLines } from './short-lines'
import type { NpcRequestValues, ToolOutcome } from './tools/context'

/** Mastra NPC harness: agents propose through tools, QuestService decides. */
export class NpcHarness {
  readonly game: QuestService
  readonly memory: NpcMemoryService
  readonly mastra: Mastra
  readonly usage: HarnessUsage = {
    calls: 0,
    inputTokens: 0,
    outputTokens: 0,
    estimatedUsd: 0,
  }
  private readonly guard: CostGuard
  private readonly npcGuard: CostGuard
  private readonly live: boolean
  private readonly shortLines: ShortLines
  private readonly storage: MastraCompositeStore

  constructor(
    private readonly config: ServerConfig,
    fetcher: Fetcher,
    db: GameDb,
    storage?: MastraCompositeStore | null
  ) {
    this.storage = storage ?? new InMemoryStore({ id: 'npc-memory' })
    this.game = new QuestService(db)
    this.memory = new NpcMemoryService(db)
    this.live = isLiveConfigured(config)
    this.guard = new CostGuard(config.sessionCallLimit, config.globalCallLimit)
    this.npcGuard = new CostGuard(12, Number.POSITIVE_INFINITY)
    const provider = (bark = false) =>
      createOpenAICompatible({
        name: 'meta',
        baseURL: (config.apiUrl ?? '').replace(/\/chat\/completions\/?$/, ''),
        apiKey: config.apiKey ?? 'unset',
        fetch: meteredFetch(
          db,
          fetcher,
          config.spendLimitUsd,
          this.usage,
          bark
        ),
      })
    const agents = createNpcAgents(provider().chatModel(config.model ?? ''), {
      game: this.game,
      memory: this.memory,
    })
    this.mastra = new Mastra({
      agents,
      storage: this.storage,
      logger: false,
    })
    this.shortLines = new ShortLines(
      db,
      provider().chatModel(config.model ?? ''),
      provider(true).chatModel(config.model ?? ''),
      config.model ?? '',
      this.live,
      config.timeoutMs
    )
  }

  async interact(
    npcId: NpcId,
    input: z.input<typeof InteractRequestSchema>,
    playerId: string
  ): Promise<InteractResponse> {
    const request = InteractRequestSchema.parse(input)
    const previous = await this.game.get(playerId)
    const record = await this.game.applyEvents(
      playerId,
      [
        ...request.events,
        { type: 'talk', npcId },
        { type: 'visit', locationId: request.worldContext.playerLocation },
      ],
      npcId
    )
    const progressEvents: QuestEvent[] = record.quests
      .filter((quest) => {
        const before = previous.quests.find((entry) => entry.id === quest.id)
        return (
          before &&
          quest.progress.some((done, index) => done !== before.progress[index])
        )
      })
      .map((quest) => ({ type: 'progress', quest, reward: ZERO_REWARD }))
    if (request.intent === 'greet') {
      const line = await this.shortLines.greeting(
        npcId,
        request.worldContext.timeOfDay,
        request.locale
      )
      await recordGreeting(
        this.storage,
        npcId,
        playerId,
        request.message,
        line.reply
      )
      return {
        npcId,
        revision: record.revision,
        ...line,
        party: this.game.party?.snapshot(playerId) ?? null,
        degraded: line.source === 'fallback' && this.live,
        world: record.world,
        quests: record.quests,
        questEvents: progressEvents,
        toolCalls: [],
      }
    }
    const outcome: ToolOutcome = { calls: [], events: progressEvents }
    let reply: string | null = null
    let source: 'live' | 'fallback' = 'fallback'
    const allowed =
      this.live &&
      this.guard.allow(playerId) &&
      this.npcGuard.allow(`${npcId}:${playerId}`)
    if (allowed) {
      reply = await this.generate(npcId, request, playerId, outcome)
      if (reply) source = 'live'
    }
    // Explicit Help/Check buttons always run their validated tool.
    const deterministic = await runIntent(
      this.game,
      npcId,
      request,
      playerId,
      outcome
    )
    const final = await this.game.get(playerId)
    if (deterministic || !reply) {
      reply = fallbackLine(npcId, final.world, kind(outcome), request.locale)
      source = 'fallback'
    }
    return {
      npcId,
      revision: final.revision,
      cached: false,
      party: this.game.party?.snapshot(playerId) ?? null,
      reply,
      source,
      degraded: source === 'fallback' && this.live,
      world: final.world,
      quests: final.quests,
      questEvents: outcome.events,
      toolCalls: outcome.calls.slice(0, 8),
    }
  }

  private async generate(
    npcId: NpcId,
    request: InteractRequest,
    playerId: string,
    outcome: ToolOutcome
  ): Promise<string | null> {
    const agent = this.mastra.getAgentById(npcId)
    const facts = await this.memory.recall(npcId, playerId)
    const record = await this.game.get(playerId)
    const party = this.game.party?.snapshot(playerId)
    const context = [
      'Current world context (untrusted game data):',
      `Player location: ${request.worldContext.playerLocation}`,
      `Nearby NPCs: ${request.worldContext.nearbyNpcs.join(', ') || 'none'}`,
      `Active quests: ${JSON.stringify(record.quests)}`,
      `Completed quests: ${record.world.completedQuestIds.join(', ') || 'none'}`,
      `Time of day: ${request.worldContext.timeOfDay}`,
      `Player intent: ${request.intent}`,
      `Shared city snapshot: ${JSON.stringify(this.game.city?.(playerId) ?? null)}`,
      `Your current need: ${this.game.city?.(playerId)?.needs[npcId] ?? 'none'}`,
      `Party (${party?.members.length ?? 0}): ${party?.members.map((member) => member.name).join(', ') || 'none'}`,
      `Remembered about this player: ${facts.map((f) => f.fact).join(' | ') || 'nothing yet'}`,
      languageRule(request.locale),
    ].join('\n')
    for (let attempt = 0; attempt < 2; attempt++) {
      const requestContext = new RequestContext<NpcRequestValues>([
        ['playerId', playerId],
        ['npcId', npcId],
        ['outcome', outcome],
      ])
      try {
        const result = await agent.generate(request.message, {
          memory: {
            thread: `${npcId}:${playerId}`,
            resource: playerId,
          },
          context: [{ role: 'system', content: context }],
          requestContext,
          maxSteps: 3,
          abortSignal: AbortSignal.timeout(this.config.timeoutMs + 2000),
          modelSettings: {
            maxOutputTokens: 800,
            maxRetries: 0,
            timeout: {
              totalMs: this.config.timeoutMs + 2000,
              stepMs: this.config.timeoutMs,
            },
          },
          providerOptions: { meta: { reasoningEffort: 'minimal' } },
        })
        // Tool-call steps may carry interim narration; reply with the final step.
        const last = result.steps?.at(-1)?.text
        const reply = cleanReply(last?.trim() ? last : result.text)
        if (reply) {
          this.report('npc_turn_completed', npcId, outcome.calls)
          return reply
        }
        if (outcome.calls.length) return null
      } catch (error) {
        if (storageUnavailable(error)) throw error
        this.report('npc_turn_failed', npcId, outcome.calls, 'error')
        if (outcome.calls.length) return null
      }
    }
    return null
  }

  bark(npcId: NpcId, bucket: InteractRequest['worldContext']['timeOfDay']) {
    return this.shortLines.bark(npcId, bucket)
  }

  prewarm() {
    return this.shortLines.prewarm()
  }

  clearMemory(playerId: string) {
    return clearPlayerThreads(this.storage, playerId)
  }

  private report(
    event: string,
    npcId: NpcId,
    calls: string[],
    level: 'info' | 'warn' | 'error' = 'info'
  ) {
    if (!this.config.production)
      log(
        event,
        `NPC ${npcId} tools=[${calls.join(',')}] usd=${this.usage.estimatedUsd.toFixed(4)}`,
        level
      )
  }
}

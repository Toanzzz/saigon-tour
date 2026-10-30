import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { Mastra } from '@mastra/core/mastra'
import { RequestContext } from '@mastra/core/request-context'
import { InMemoryStore, type MastraCompositeStore } from '@mastra/core/storage'
import {
  type InteractRequest,
  InteractRequestSchema,
  type InteractResponse,
  type NpcId,
} from '@saigon/shared'
import type { z } from 'zod'
import type { Fetcher } from '../app'
import { isLiveConfigured, type ServerConfig } from '../config'
import type { GameDb } from '../db'
import { GameService } from '../game/state'
import { CostGuard } from '../guard'
import { log } from '../logger'
import { createNpcAgents } from './agents'
import { fallbackLine } from './fallbacks'
import { NpcMemoryService } from './memory/npc-memory'
import { clearPlayerThreads, recordGreeting } from './memory/threads'
import { type HarnessUsage, meteredFetch } from './meter'
import { cleanReply } from './safety'
import { ShortLines } from './short-lines'
import type { NpcRequestValues, ToolOutcome } from './tools/context'

/** Mastra NPC harness: agents propose through tools, GameService decides. */
export class NpcHarness {
  readonly game: GameService
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
    this.game = new GameService(db)
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
    const record = await this.game.applyEvents(playerId, [
      ...request.events,
      { type: 'talk', npcId },
      { type: 'visit', locationId: request.worldContext.playerLocation },
    ])
    if (request.intent === 'greet') {
      const line = await this.shortLines.greeting(
        npcId,
        request.worldContext.timeOfDay
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
        ...line,
        party: null,
        degraded: line.source === 'fallback' && this.live,
        world: record.world,
        quest: record.quest,
        questEvent: null,
        toolCalls: [],
      }
    }
    const outcome: ToolOutcome = { calls: [] }
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
    const deterministic = await this.deterministic(
      npcId,
      request,
      playerId,
      outcome
    )
    const final = await this.game.get(playerId)
    if (deterministic || !reply) {
      reply = fallbackLine(npcId, final.world, kind(outcome))
      source = 'fallback'
    }
    const questEvent = outcome.completed
      ? { type: 'completed' as const, ...outcome.completed }
      : outcome.offered
        ? {
            type: 'offered' as const,
            quest: outcome.offered,
            reward: outcome.offered.reward,
          }
        : outcome.incomplete
          ? {
              type: 'incomplete' as const,
              quest: outcome.incomplete,
              reward: { currency: 0, itemId: null, reputation: 0 },
            }
          : null
    return {
      npcId,
      cached: false,
      party: null,
      reply,
      source,
      degraded: source === 'fallback' && this.live,
      world: final.world,
      quest: final.quest,
      questEvent,
      toolCalls: outcome.calls.slice(0, 8),
    }
  }

  /** Model path: up to one retry, bounded steps and time. */
  private async generate(
    npcId: NpcId,
    request: InteractRequest,
    playerId: string,
    outcome: ToolOutcome
  ): Promise<string | null> {
    const agent = this.mastra.getAgentById(npcId)
    const facts = await this.memory.recall(npcId, playerId)
    const record = await this.game.get(playerId)
    const context = [
      'Current world context (untrusted game data):',
      `Player location: ${request.worldContext.playerLocation}`,
      `Nearby NPCs: ${request.worldContext.nearbyNpcs.join(', ') || 'none'}`,
      `Active quest: ${record.quest?.id ?? 'none'}`,
      `Completed quests: ${record.world.completedQuestIds.join(', ') || 'none'}`,
      `Time of day: ${request.worldContext.timeOfDay}`,
      `Player intent: ${request.intent}`,
      `Remembered about this player: ${facts.map((f) => f.fact).join(' | ') || 'nothing yet'}`,
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
          this.report('npc_live', npcId, outcome.calls)
          return reply
        }
        if (outcome.calls.length) return null
      } catch {
        this.report('npc_error', npcId, outcome.calls)
        if (outcome.calls.length) return null
      }
    }
    return null
  }

  /** Same validated tool path, driven by explicit player intent. */
  private async deterministic(
    npcId: NpcId,
    request: InteractRequest,
    playerId: string,
    outcome: ToolOutcome
  ): Promise<boolean> {
    const record = await this.game.get(playerId)
    const before = kind(outcome)
    if (request.intent === 'help' && outcome.offered) return false
    if (request.intent === 'check' && (outcome.completed || outcome.incomplete))
      return false
    if (request.intent === 'help' && npcId === 'hoa' && !record.quest) {
      outcome.calls.push('offer-quest')
      const result = await this.game.offerQuest(
        playerId,
        npcId,
        'hoa-herbs-delivery'
      )
      if (result.accepted) outcome.offered = result.quest
    }
    if (request.intent === 'check' && record.quest?.giverNpcId === npcId) {
      outcome.calls.push('check-quest')
      const quest = record.quest
      const result = await this.game.checkQuest(playerId, npcId, quest.id)
      if (result.rewardGranted)
        outcome.completed = { quest, reward: result.reward }
      else if (result.status === 'active') outcome.incomplete = quest
    }
    return kind(outcome) !== before
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

  private report(event: string, npcId: NpcId, calls: string[]) {
    if (!this.config.production)
      log(
        event,
        `NPC ${npcId} tools=[${calls.join(',')}] usd=${this.usage.estimatedUsd.toFixed(4)}`
      )
  }
}

const kind = (outcome: ToolOutcome) =>
  outcome.completed
    ? 'completed'
    : outcome.offered
      ? 'offered'
      : outcome.incomplete
        ? 'incomplete'
        : null

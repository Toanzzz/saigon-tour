import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { Mastra } from '@mastra/core/mastra'
import { RequestContext } from '@mastra/core/request-context'
import { InMemoryStore, type MastraCompositeStore } from '@mastra/core/storage'
import {
  friendlinessOf,
  type InteractRequest,
  InteractRequestSchema,
  type InteractResponse,
  type NpcId,
  type QuestEvent,
  ZERO_REWARD,
} from '@saigon/shared'
import type { z } from 'zod'
import {
  completeReady,
  outcomeKind as kind,
  offerSeed,
  QuestService,
} from '@/domain/quests'
import { log } from '@/shared'
import { isLiveConfigured, type ServerConfig } from '@/shared/config'
import type { GameDb } from '@/shared/db'
import type { Fetcher } from '@/shared/http'
import { createNpcAgents } from './agents'
import { fallbackLine } from './fallbacks'
import { greetingContext } from './greeting-context'
import { CostGuard } from './guard'
import { NpcMemoryService } from './memory/npc-memory'
import { clearPlayerThreads, readHistory, recordTurn } from './memory/threads'
import { type HarnessUsage, meteredFetch, storageUnavailable } from './meter'
import { cleanReply } from './safety'
import { ShortLines } from './short-lines'
import type { NpcRequestValues, ToolOutcome } from './tools/context'
import { buildContext, friendshipChanges } from './turn'

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
    if (request.intent === 'help' || request.intent === 'check')
      request.intent = 'chat'
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
    const completed = await completeReady(this.game, playerId, npcId)
    progressEvents.push(...record.questEvents, ...completed)
    const current = await this.game.get(playerId)
    // The completed quest's authored punchline, delivered on return.
    const completedPayoff = completed
      .map((event) => event.quest.payoff)
      .find((payoff): payoff is string => Boolean(payoff))
    // A twist that applied during this turn's events is spoken by the NPC where
    // it triggered (the Sho TALK_TO target), which is the NPC being greeted now.
    const twistedLine = record.quests
      .map((quest) => {
        const before = previous.quests.find((entry) => entry.id === quest.id)
        return quest.twist?.replaced && !before?.twist?.replaced
          ? quest.twist.line
          : null
      })
      .find((line): line is string => Boolean(line))
    if (request.intent === 'greet') {
      const npcQuests = current.quests.filter(
        (quest) => quest.giverNpcId === npcId
      )
      const errand = npcQuests.some((quest) => quest.status === 'ready')
        ? 'ready'
        : npcQuests.some((quest) => quest.status === 'active')
          ? 'active'
          : null
      const line = await this.shortLines.greeting(
        npcId,
        greetingContext(
          npcId,
          friendlinessOf(current.friendship, npcId),
          request.worldContext.timeOfDay,
          this.game.city?.(playerId),
          errand
        ),
        request.locale
      )
      if (completed.length)
        line.reply =
          completedPayoff ??
          fallbackLine(npcId, current.world, 'completed', request.locale)
      // A fresh twist speaks its authored line over the cached greeting.
      if (twistedLine) line.reply = twistedLine
      await recordTurn(
        this.storage,
        npcId,
        playerId,
        request.message,
        line.reply,
        true
      )
      return {
        npcId,
        revision: current.revision,
        ...line,
        party: this.game.party?.snapshot(playerId) ?? null,
        degraded: line.source === 'fallback' && this.live,
        friendship: current.friendship,
        friendshipEvents: friendshipChanges(
          previous.friendship,
          current.friendship,
          progressEvents
        ),
        world: current.world,
        quests: current.quests,
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
      reply = await this.generate(
        npcId,
        request,
        playerId,
        outcome,
        twistedLine ?? null
      )
      if (reply) source = 'live'
    }
    if (!reply) await offerSeed(this.game, npcId, request, playerId, outcome)
    const final = await this.game.get(playerId)
    if (!reply) {
      reply =
        (kind(outcome) === 'completed' ? completedPayoff : null) ??
        fallbackLine(
          npcId,
          final.world,
          kind(outcome),
          request.locale,
          friendlinessOf(final.friendship, npcId)
        )
      source = 'fallback'
    }
    // Record every chat turn exactly once. Mastra memory is read-only, so this
    // is the only writer; live and fallback replies persist the same way.
    await recordTurn(this.storage, npcId, playerId, request.message, reply)
    return {
      npcId,
      revision: final.revision,
      cached: false,
      party: this.game.party?.snapshot(playerId) ?? null,
      reply,
      source,
      degraded: source === 'fallback' && this.live,
      friendship: final.friendship,
      friendshipEvents: friendshipChanges(
        previous.friendship,
        final.friendship,
        outcome.events
      ),
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
    outcome: ToolOutcome,
    twistedLine: string | null
  ): Promise<string | null> {
    const agent = this.mastra.getAgentById(npcId)
    const context = await buildContext(
      this.game,
      this.memory,
      npcId,
      request,
      playerId,
      outcome,
      twistedLine
    )
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
            // The harness is the single history writer (see recordTurn below).
            // Read memory for recall, but never let the agent persist turns, or
            // live and fallback writers duplicate/orphan messages in the thread.
            options: { readOnly: true },
          },
          context: [{ role: 'system', content: context }],
          requestContext,
          maxSteps: 3,
          abortSignal: AbortSignal.timeout(this.config.timeoutMs + 2000),
          modelSettings: {
            maxOutputTokens: 4000,
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
  settleGreetings() {
    return this.shortLines.settled()
  }
  history(npcId: NpcId, playerId: string, limit = 30) {
    return readHistory(this.storage, npcId, playerId, limit)
  }
  async clearMemory(playerId: string) {
    await (await this.mastra.getAgentById('hoa').getMemory())?.settled()
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

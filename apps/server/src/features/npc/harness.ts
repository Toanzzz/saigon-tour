import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { Mastra } from '@mastra/core/mastra'
import { InMemoryStore, type MastraCompositeStore } from '@mastra/core/storage'
import {
  friendlinessOf,
  type InteractRequest,
  InteractRequestSchema,
  type InteractResponse,
  type NpcId,
} from '@saigon/shared'
import type { z } from 'zod'
import {
  hostedMilestone,
  outcomeKind as kind,
  offerApex,
  offerDemoSeed,
  offerMilestone,
  offerSeed,
  QuestService,
} from '@/domain/quests'
import { log } from '@/shared'
import { isLiveConfigured, type ServerConfig } from '@/shared/config'
import type { GameDb } from '@/shared/db'
import type { Fetcher } from '@/shared/http'
import { createNpcAgents } from './agents'
import { prepareEncounter } from './encounter'
import { fallbackLine, offeredErrandLine } from './fallbacks'
import { CostGuard } from './guard'
import { NpcMemoryService } from './memory/npc-memory'
import { clearPlayerThreads, readHistory, recordTurn } from './memory/threads'
import { type HarnessUsage, meteredFetch } from './meter'
import { openingResponse } from './opening'
import { ShortLines } from './short-lines'
import type { ToolOutcome } from './tools/context'
import { friendshipChanges } from './turn'
import { type TurnDelivery, TurnGenerator } from './turn-generation'

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
  private readonly turns: TurnGenerator
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
    this.guard = new CostGuard(
      config.sessionCallLimit,
      config.globalCallLimit,
      config.production,
      'npc_call_guard'
    )
    this.npcGuard = new CostGuard(
      12,
      Number.POSITIVE_INFINITY,
      config.production,
      'npc_per_pair_guard'
    )
    const provider = (bark = false) =>
      createOpenAICompatible({
        name: 'meta',
        baseURL: (config.apiUrl ?? '').replace(/\/chat\/completions\/?$/, ''),
        apiKey: config.apiKey ?? 'unset',
        includeUsage: true,
        fetch: meteredFetch(
          db,
          fetcher,
          config.spendLimitUsd,
          this.usage,
          bark,
          config.production
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
    this.turns = new TurnGenerator(
      config,
      this.mastra,
      this.game,
      this.memory,
      (...args) => this.report(...args)
    )
    this.shortLines = new ShortLines(
      provider(true).chatModel(config.model ?? ''),
      this.live,
      config.timeoutMs
    )
  }

  async interact(
    npcId: NpcId,
    input: z.input<typeof InteractRequestSchema>,
    playerId: string,
    delivery?: TurnDelivery
  ): Promise<InteractResponse> {
    const request = InteractRequestSchema.parse(input)
    if (request.intent === 'greet') request.intent = 'open'
    const receivedAt = new Date()
    if (request.intent === 'help' || request.intent === 'check')
      request.intent = 'chat'
    const encounter = await prepareEncounter(
      this.game,
      npcId,
      request,
      playerId
    )
    const {
      previous,
      progressEvents,
      completedPayoff,
      twistedLine,
      riddleContext,
    } = encounter
    if (request.intent === 'open')
      return openingResponse(
        this.game,
        this.storage,
        npcId,
        request,
        playerId,
        encounter
      )
    const outcome: ToolOutcome = { calls: [], events: progressEvents }
    // Milestone offers run before the reply so the LLM can voice them.
    let milestoneContext: string | null = null
    let milestoneFallback: string | null = null
    // The host auto-offers the apex whenever the player holds every component.
    if (hostedMilestone(npcId)) {
      const apex = await offerApex(this.game, playerId, npcId, request.locale)
      if (apex.offered && apex.quest) {
        outcome.events.push({
          type: 'offered',
          quest: apex.quest,
          reward: apex.quest.reward,
        })
        milestoneContext = `You just offered ${apex.title}; set it up in your voice.`
        milestoneFallback = apex.description ?? null
      }
    }
    // The `milestone` intent asks a component giver for its errand.
    if (request.intent === 'milestone' && !milestoneContext) {
      const offer = await offerMilestone(
        this.game,
        playerId,
        npcId,
        request.locale
      )
      if (offer.offered && offer.quest) {
        outcome.events.push({
          type: 'offered',
          quest: offer.quest,
          reward: offer.quest.reward,
        })
        milestoneContext = `You just offered ${offer.title}; set it up in your voice.`
        milestoneFallback = offer.description ?? null
      }
    }
    let reply: string | null = null
    let source: 'live' | 'fallback' = 'fallback'
    // `?demo`: the authored demo seed is offered and described instantly, with
    // no model call, so the recording path never waits on the provider.
    const demoQuest = milestoneContext
      ? null
      : await offerDemoSeed(this.game, npcId, request, playerId, outcome)
    if (demoQuest) {
      reply = offeredErrandLine(demoQuest, request.locale)
      // Same authored line the live path returns for an accepted offer.
      source = this.live ? 'live' : 'fallback'
    }
    const allowed =
      !demoQuest &&
      this.live &&
      this.guard.allow(playerId) &&
      this.npcGuard.allow(`${npcId}:${playerId}`)
    if (allowed) {
      reply = await this.turns.generate(
        npcId,
        request,
        playerId,
        outcome,
        twistedLine ?? null,
        riddleContext,
        milestoneContext,
        delivery
      )
      if (reply) source = 'live'
    }
    if (!reply && !milestoneFallback)
      await offerSeed(this.game, npcId, request, playerId, outcome)
    const final = await this.game.get(playerId)
    if (!reply) {
      // An errand just offered this turn is described in the giver's voice so
      // the player learns what to do in chat; the journal entry is incidental.
      const offeredQuest = outcome.events.find(
        (event) => event.type === 'offered'
      )?.quest
      reply =
        (kind(outcome) === 'completed' ? completedPayoff : null) ??
        milestoneFallback ??
        (offeredQuest
          ? offeredErrandLine(offeredQuest, request.locale)
          : null) ??
        fallbackLine(
          npcId,
          final.world,
          kind(outcome),
          request.locale,
          friendlinessOf(final.friendship, npcId),
          final.quests
        )
      source = 'fallback'
    }
    // Record every chat turn exactly once. Mastra memory is read-only, so this
    // is the only writer; live and fallback replies persist the same way.
    const messages = await recordTurn(
      this.storage,
      npcId,
      playerId,
      request.message,
      reply,
      {
        messageId: request.messageId,
        sentAt: request.sentAt ? new Date(request.sentAt) : receivedAt,
      }
    )
    return {
      npcId,
      revision: final.revision,
      cached: false,
      party: this.game.party?.snapshot(playerId) ?? null,
      reply,
      messages,
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

  bark(npcId: NpcId, bucket: InteractRequest['worldContext']['timeOfDay']) {
    return this.shortLines.bark(npcId, bucket)
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
    level: 'info' | 'warn' | 'error' = 'info',
    detail?: string
  ) {
    if (!this.config.production)
      log(
        event,
        `NPC ${npcId} tools=[${calls.join(',')}] usd=${this.usage.estimatedUsd.toFixed(4)}${detail ? ` ${detail}` : ''}`,
        level
      )
  }
}

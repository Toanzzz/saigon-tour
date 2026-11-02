import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { Mastra } from '@mastra/core/mastra'
import { InMemoryStore, type MastraCompositeStore } from '@mastra/core/storage'
import {
  type CityEvent,
  type CitySnapshot,
  friendlinessOf,
  type InteractRequest,
  InteractRequestSchema,
  type InteractResponse,
  NPCS,
  type NpcId,
  type QuestEvent,
  refersToGreeting,
  relevantNpcsForEvent,
  stepText,
  ZERO_REWARD,
} from '@saigon/shared'
import type { z } from 'zod'
import {
  completeReady,
  hostedMilestone,
  outcomeKind as kind,
  offerApex,
  offerMilestone,
  offerSeed,
  QuestService,
} from '@/domain/quests'
import { log } from '@/shared'
import { isLiveConfigured, type ServerConfig } from '@/shared/config'
import type { GameDb } from '@/shared/db'
import type { Fetcher } from '@/shared/http'
import { createNpcAgents } from './agents'
import { fallbackLine, offeredErrandLine } from './fallbacks'
import { fillGreetingName, greetingContext } from './greeting-context'
import { CostGuard } from './guard'
import { NpcMemoryService } from './memory/npc-memory'
import { clearPlayerThreads, readHistory, recordTurn } from './memory/threads'
import { type HarnessUsage, meteredFetch } from './meter'
import { ShortLines } from './short-lines'
import type { ToolOutcome } from './tools/context'
import { friendshipChanges } from './turn'
import { TurnGenerator } from './turn-generation'

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
  /** The opener shown to each player per NPC, injected only when they refer to it. */
  private readonly lastGreeting = new Map<string, string>()

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
    // A riddle revealed by this greet's talk is spoken as the authored reveal.
    const riddleRevealLine = record.quests
      .map((quest) => {
        const before = previous.quests.find((entry) => entry.id === quest.id)
        const first = quest.steps[0]
        return quest.riddle && first && quest.revealed && !before?.revealed
          ? stepText(first, request.locale)
          : null
      })
      .find((answer): answer is string => Boolean(answer))
    // Chat-path riddle context for this giver: hint-only while hidden, or an
    // instruction to voice the answer on the turn it was revealed.
    const giverRiddle = record.quests.find(
      (quest) =>
        quest.giverNpcId === npcId && quest.riddle && !quest.progress[0]
    )
    const giverRiddleBefore = giverRiddle
      ? previous.quests.find((entry) => entry.id === giverRiddle.id)
      : undefined
    const first = giverRiddle?.steps[0]
    let riddleContext: string | null = null
    if (giverRiddle && first) {
      if (giverRiddle.revealed && !giverRiddleBefore?.revealed)
        riddleContext = `You just told the player the riddle answer: ${stepText(first, request.locale)}. Say it in your voice.`
      else if (!giverRiddle.revealed && giverRiddle.riddle)
        riddleContext = `Riddle unrevealed: ${giverRiddle.riddle.text}. Hint, never answer.`
    }
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
      // A riddle the greet just revealed speaks the authored reveal line.
      else if (riddleRevealLine)
        line.reply =
          request.locale === 'vi'
            ? `Câu đố đó hả? ${riddleRevealLine}.`
            : `That riddle? ${riddleRevealLine}.`
      // Fill the optional {name} placeholder the persona greeting may carry.
      line.reply = fillGreetingName(line.reply, request.playerName ?? null)
      // The opener is shown to the player but kept out of the conversation
      // thread; it is injected only if a later turn refers back to it.
      this.lastGreeting.set(`${npcId}:${playerId}`, line.reply)
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
    const allowed =
      this.live &&
      this.guard.allow(playerId) &&
      this.npcGuard.allow(`${npcId}:${playerId}`)
    if (allowed) {
      const referredGreeting = refersToGreeting(request.message)
        ? (this.lastGreeting.get(`${npcId}:${playerId}`) ?? null)
        : null
      reply = await this.turns.generate(
        npcId,
        request,
        playerId,
        outcome,
        twistedLine ?? null,
        riddleContext,
        milestoneContext,
        referredGreeting
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

  /**
   * Director signal: an event just started, so NPCs tied to it precompute a
   * fresh greeting across every affinity tier before any player walks up.
   */
  async prepareGreetings(city: CitySnapshot, events: CityEvent[]) {
    const npcs = new Set<NpcId>()
    for (const event of events)
      for (const npcId of relevantNpcsForEvent(city, event)) npcs.add(npcId)
    await Promise.allSettled(
      [...npcs].map((npcId) =>
        this.shortLines.prepare(
          npcId,
          greetingContext(
            npcId,
            NPCS[npcId].friendliness,
            'morning',
            city,
            null
          )
        )
      )
    )
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

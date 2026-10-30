import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { Mastra } from '@mastra/core/mastra'
import { RequestContext } from '@mastra/core/request-context'
import { InMemoryStore } from '@mastra/core/storage'
import {
  type InteractRequest,
  InteractRequestSchema,
  type InteractResponse,
  type NpcId,
} from '@saigon/shared'
import type { z } from 'zod'
import type { Fetcher } from '../app'
import { isLiveConfigured, type ServerConfig } from '../config'
import { GameService } from '../game/state'
import { CostGuard } from '../guard'
import { log } from '../logger'
import { createNpcAgents } from './agents'
import { fallbackLine } from './fallbacks'
import { NpcMemoryService } from './memory/npc-memory'
import { cleanReply } from './safety'
import type { NpcRequestValues, ToolOutcome } from './tools/context'

export interface HarnessUsage {
  calls: number
  inputTokens: number
  outputTokens: number
  estimatedUsd: number
}
// Muse Spark standard rates per million tokens; the contributor model is cheaper.
const INPUT_USD = 0.5 / 1e6
const OUTPUT_USD = 2 / 1e6

/** Mastra NPC harness: agents propose through tools, GameService decides. */
export class NpcHarness {
  readonly game = new GameService()
  readonly memory = new NpcMemoryService()
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

  constructor(
    private readonly config: ServerConfig,
    fetcher: Fetcher = fetch
  ) {
    this.live = isLiveConfigured(config)
    this.guard = new CostGuard(
      config.sessionCallLimit,
      config.globalCallLimit,
      config.spendLimitUsd
    )
    this.npcGuard = new CostGuard(12, Number.POSITIVE_INFINITY, Infinity)
    const provider = createOpenAICompatible({
      name: 'meta',
      baseURL: (config.apiUrl ?? '').replace(/\/chat\/completions\/?$/, ''),
      apiKey: config.apiKey ?? 'unset',
      fetch: fetcher,
    })
    const agents = createNpcAgents(provider.chatModel(config.model ?? ''), {
      game: this.game,
      memory: this.memory,
    })
    this.mastra = new Mastra({
      agents,
      storage: new InMemoryStore({ id: 'npc-memory' }),
      logger: false,
    })
  }

  async interact(
    npcId: NpcId,
    input: z.input<typeof InteractRequestSchema>
  ): Promise<InteractResponse> {
    const request = InteractRequestSchema.parse(input)
    const { playerId } = request
    const record = this.game.applyEvents(playerId, [
      ...request.events,
      { type: 'talk', npcId },
      { type: 'visit', locationId: request.worldContext.playerLocation },
    ])
    const outcome: ToolOutcome = { calls: [] }
    let reply: string | null = null
    let source: 'live' | 'fallback' = 'fallback'
    const allowed =
      this.live &&
      this.guard.allow(playerId) &&
      this.npcGuard.allow(`${npcId}:${playerId}`)
    if (allowed) {
      reply = await this.generate(npcId, request, outcome)
      if (reply) source = 'live'
    }
    // Explicit Help/Check buttons always run their validated tool.
    if (this.deterministic(npcId, request, outcome) || !reply)
      reply = fallbackLine(npcId, record.world, kind(outcome))
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
      reply,
      source,
      degraded: source === 'fallback' && this.live,
      world: structuredClone(this.game.get(playerId).world),
      quest: this.game.get(playerId).quest,
      questEvent,
      toolCalls: outcome.calls.slice(0, 8),
    }
  }

  /** Model path: up to one retry, bounded steps and time. */
  private async generate(
    npcId: NpcId,
    request: InteractRequest,
    outcome: ToolOutcome
  ): Promise<string | null> {
    const agent = this.mastra.getAgentById(npcId)
    const facts = this.memory.recall(npcId, request.playerId)
    const record = this.game.get(request.playerId)
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
        ['playerId', request.playerId],
        ['npcId', npcId],
        ['outcome', outcome],
      ])
      try {
        const result = await agent.generate(request.message, {
          memory: {
            thread: `${npcId}:${request.playerId}`,
            resource: request.playerId,
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
        this.track(result.totalUsage ?? result.usage)
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
  private deterministic(
    npcId: NpcId,
    request: InteractRequest,
    outcome: ToolOutcome
  ): boolean {
    const record = this.game.get(request.playerId)
    const before = kind(outcome)
    if (request.intent === 'help' && outcome.calls.includes('offer-quest'))
      return false
    if (request.intent === 'check' && outcome.calls.includes('check-quest'))
      return false
    if (request.intent === 'help' && npcId === 'hoa' && !record.quest) {
      const result = this.game.offerQuest(
        request.playerId,
        npcId,
        'hoa-herbs-delivery'
      )
      if (result.accepted) outcome.offered = result.quest
    }
    if (request.intent === 'check' && record.quest?.giverNpcId === npcId) {
      const quest = record.quest
      const result = this.game.checkQuest(request.playerId, npcId, quest.id)
      if (result.rewardGranted)
        outcome.completed = { quest, reward: result.reward }
      else outcome.incomplete = quest
    }
    return kind(outcome) !== before
  }

  private track(
    usage: { inputTokens?: number; outputTokens?: number } | undefined
  ) {
    this.usage.calls += 1
    this.usage.inputTokens += usage?.inputTokens ?? 0
    this.usage.outputTokens += usage?.outputTokens ?? 0
    this.usage.estimatedUsd =
      this.usage.inputTokens * INPUT_USD + this.usage.outputTokens * OUTPUT_USD
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

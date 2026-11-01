import { createHash } from 'node:crypto'
import { Agent } from '@mastra/core/agent'
import type { MastraModelConfig } from '@mastra/core/llm'
import {
  AFFINITY_TIERS,
  type Locale,
  LocaleSchema,
  NPCS,
  type NpcId,
  TIER_LEVEL,
  type TimeOfDay,
} from '@saigon/shared'
import type { GameDb } from '@/shared/db'
import { NPC_PERSONAS } from './agents'
import {
  fallbackGreeting,
  type GreetingContext,
  greetingContext,
  greetingPrompt,
  greetingSignature,
} from './greeting-context'
import { storageUnavailable } from './meter'
import { languageRule } from './personas/shared'
import { cleanReply } from './safety'

export interface ShortLine {
  reply: string
  source: 'live' | 'fallback'
}
export const GREETING_BUCKETS: TimeOfDay[] = [
  'morning',
  'afternoon',
  'evening',
  'night',
]
const fallback = (
  npc: NpcId,
  bucket: TimeOfDay,
  locale: Locale = 'en'
): ShortLine => ({
  reply: fallbackGreeting(
    npc,
    greetingContext(npc, NPCS[npc].friendliness, bucket, null),
    locale
  ),
  source: 'fallback',
})

/** Short generations have no memory or tools, so they cannot mutate a save. */
export class ShortLines {
  private pending = new Map<string, Promise<ShortLine>>()
  private agents: Record<NpcId, Agent>
  private barkAgents: Record<NpcId, Agent>

  constructor(
    private readonly db: GameDb,
    model: MastraModelConfig,
    barkModel: MastraModelConfig,
    private readonly modelId: string,
    private readonly live: boolean,
    private readonly timeoutMs: number
  ) {
    const agents = (value: MastraModelConfig) =>
      Object.fromEntries(
        (Object.keys(NPCS) as NpcId[]).map((npc) => [
          npc,
          new Agent({
            id: `${npc}-short`,
            name: NPCS[npc].name,
            instructions: NPC_PERSONAS[npc],
            model: value,
          }),
        ])
      ) as Record<NpcId, Agent>
    this.agents = agents(model)
    this.barkAgents = agents(barkModel)
  }

  key(npc: NpcId, context: GreetingContext, locale: Locale = 'en') {
    const hash = createHash('sha256')
      .update(
        `greeting-v4\0${NPC_PERSONAS[npc]}\0${this.modelId}\0${greetingSignature(context)}`
      )
      .digest('hex')
    return `${npc}:${locale}:${hash}`
  }

  async greeting(
    npc: NpcId,
    context: GreetingContext,
    locale: Locale = 'en',
    wait = false
  ): Promise<ShortLine & { cached: boolean }> {
    const key = this.key(npc, context, locale)
    const existing = await this.db.getGreeting(key)
    if (existing) return { ...existing, cached: true }
    let pending = this.pending.get(key)
    const shared = Boolean(pending)
    if (!pending) {
      pending = this.fill(npc, context, locale, key)
      this.pending.set(key, pending)
      void pending
        .catch(() => {})
        .finally(() => {
          if (this.pending.get(key) === pending) this.pending.delete(key)
        })
    }
    if (!wait && this.live)
      return {
        reply: fallbackGreeting(npc, context, locale),
        source: 'fallback',
        cached: false,
      }
    return { ...(await pending), cached: shared }
  }

  /**
   * Precompute greetings for one NPC across every affinity tier and locale.
   * The Director calls this when an event starts and signals relevant NPCs, so
   * the state-aware opener is cached before any player greets.
   */
  async prepare(
    npc: NpcId,
    baseContext: GreetingContext,
    locales: readonly Locale[] = LocaleSchema.options
  ) {
    const results = []
    for (const locale of locales)
      for (const bucket of GREETING_BUCKETS)
        for (const tier of AFFINITY_TIERS) {
          const context = {
            ...baseContext,
            level: TIER_LEVEL[tier],
            timeOfDay: bucket,
          }
          results.push({
            npcId: npc,
            tier,
            bucket,
            locale,
            ...(await this.greeting(npc, context, locale, true)),
          })
        }
    return results
  }

  private async fill(
    npc: NpcId,
    context: GreetingContext,
    locale: Locale,
    key: string
  ) {
    const line = await this.generateGreeting(npc, context, locale)
    if (line.source === 'live')
      await this.db.putGreeting(key, line.reply, line.source)
    return line
  }

  async bark(npc: NpcId, bucket: TimeOfDay): Promise<ShortLine> {
    return this.generate(npc, bucket, true)
  }

  async settled() {
    await Promise.allSettled(this.pending.values())
  }

  async prewarm() {
    const results = []
    for (const locale of LocaleSchema.options)
      for (const npc of Object.keys(NPCS) as NpcId[])
        for (const bucket of GREETING_BUCKETS)
          results.push({
            npcId: npc,
            bucket,
            locale,
            ...(await this.greeting(
              npc,
              greetingContext(npc, NPCS[npc].friendliness, bucket, null),
              locale,
              true
            )),
          })
    return results
  }

  private async generateGreeting(
    npc: NpcId,
    context: GreetingContext,
    locale: Locale
  ): Promise<ShortLine> {
    if (!this.live)
      return {
        reply: fallbackGreeting(npc, context, locale),
        source: 'fallback',
      }
    try {
      const result = await this.agents[npc].generate(
        `${greetingPrompt(npc, context)} ${languageRule(locale)}`,
        {
          activeTools: [],
          maxSteps: 1,
          abortSignal: AbortSignal.timeout(this.timeoutMs),
          modelSettings: { maxOutputTokens: 2000, maxRetries: 0 },
          providerOptions: { meta: { reasoningEffort: 'minimal' } },
        }
      )
      const reply = cleanReply(result.text)
      if (reply && result.finishReason !== 'length')
        return { reply, source: 'live' }
    } catch (error) {
      if (storageUnavailable(error)) throw error
    }
    return { reply: fallbackGreeting(npc, context, locale), source: 'fallback' }
  }

  private async generate(
    npc: NpcId,
    bucket: TimeOfDay,
    bark: boolean,
    locale: Locale = 'en'
  ): Promise<ShortLine> {
    if (!this.live) return fallback(npc, bucket, locale)
    try {
      const agent = (bark ? this.barkAgents : this.agents)[npc]
      const result = await agent.generate(
        `It is ${bucket}. Say one short atmospheric neighborhood line for passersby. Do not offer an errand.`,
        {
          activeTools: [],
          maxSteps: 1,
          abortSignal: AbortSignal.timeout(this.timeoutMs),
          modelSettings: { maxOutputTokens: 2000, maxRetries: 0 },
          providerOptions: { meta: { reasoningEffort: 'minimal' } },
        }
      )
      const reply = cleanReply(result.text)
      if (reply && result.finishReason !== 'length')
        return { reply, source: 'live' }
    } catch (error) {
      if (storageUnavailable(error)) throw error
    }
    return fallback(npc, bucket, locale)
  }
}

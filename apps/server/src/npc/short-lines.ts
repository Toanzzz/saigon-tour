import { createHash } from 'node:crypto'
import { Agent } from '@mastra/core/agent'
import type { MastraModelConfig } from '@mastra/core/llm'
import { NPCS, type NpcId, type TimeOfDay } from '@saigon/shared'
import type { GameDb } from '../db'
import { NPC_PERSONAS } from './agents'
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
const fallback = (npc: NpcId, bucket: TimeOfDay): ShortLine => ({
  reply: `Chào bạn! A lovely ${bucket} in Sài Gòn. ${NPCS[npc].knowledge[0]}`,
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

  key(npc: NpcId, bucket: TimeOfDay) {
    const hash = createHash('sha256')
      .update(`${NPC_PERSONAS[npc]}\0${this.modelId}`)
      .digest('hex')
    return `${npc}:${bucket}:${hash}`
  }

  async greeting(
    npc: NpcId,
    bucket: TimeOfDay
  ): Promise<ShortLine & { cached: boolean }> {
    const key = this.key(npc, bucket)
    const existing = await this.db.getGreeting(key)
    if (existing) return { ...existing, cached: true }
    let pending = this.pending.get(key)
    const shared = Boolean(pending)
    if (!pending) {
      pending = this.fill(npc, bucket, key)
      this.pending.set(key, pending)
    }
    try {
      return { ...(await pending), cached: shared }
    } finally {
      if (this.pending.get(key) === pending) this.pending.delete(key)
    }
  }

  private async fill(npc: NpcId, bucket: TimeOfDay, key: string) {
    const line = await this.generate(npc, bucket, false)
    await this.db.putGreeting(key, line.reply, line.source)
    return line
  }

  async bark(npc: NpcId, bucket: TimeOfDay): Promise<ShortLine> {
    return this.generate(npc, bucket, true)
  }

  async prewarm() {
    const results = []
    for (const npc of Object.keys(NPCS) as NpcId[])
      for (const bucket of GREETING_BUCKETS)
        results.push({
          npcId: npc,
          bucket,
          ...(await this.greeting(npc, bucket)),
        })
    return results
  }

  private async generate(
    npc: NpcId,
    bucket: TimeOfDay,
    bark: boolean
  ): Promise<ShortLine> {
    if (!this.live) return fallback(npc, bucket)
    try {
      const agent = (bark ? this.barkAgents : this.agents)[npc]
      const result = await agent.generate(
        bark
          ? `It is ${bucket}. Say one short atmospheric neighborhood line for passersby. Do not offer an errand.`
          : `It is ${bucket}. Give one short welcoming greeting to a new visitor. Do not offer or claim to start an errand.`,
        {
          activeTools: [],
          maxSteps: 1,
          abortSignal: AbortSignal.timeout(this.timeoutMs),
          modelSettings: { maxOutputTokens: 120, maxRetries: 0 },
          providerOptions: { meta: { reasoningEffort: 'minimal' } },
        }
      )
      const reply = cleanReply(result.text)
      if (reply) return { reply, source: 'live' }
    } catch {
      /* Deterministic neighborhood life continues without the model. */
    }
    return fallback(npc, bucket)
  }
}

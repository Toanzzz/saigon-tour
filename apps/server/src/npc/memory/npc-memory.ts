import { Memory } from '@mastra/memory'
import type { NpcId } from '@saigon/shared'

/** Recent conversation per npc+player thread, kept in Mastra storage. */
export const createNpcMemory = () =>
  new Memory({ options: { lastMessages: 10, generateTitle: false } })

export interface PlayerFact {
  npcId: NpcId
  playerId: string
  fact: string
  importance: 'low' | 'medium' | 'high'
  createdAt: string
}

/** Durable facts each NPC chose to remember, scoped by npcId + playerId. */
export class NpcMemoryService {
  private facts = new Map<string, PlayerFact[]>()

  constructor(
    private readonly perThread = 12,
    private readonly maxThreads = 4000
  ) {}

  remember(fact: Omit<PlayerFact, 'createdAt'>): boolean {
    const key = `${fact.npcId}:${fact.playerId}`
    const list = this.facts.get(key) ?? []
    if (list.some((entry) => entry.fact === fact.fact)) return true
    if (!this.facts.has(key) && this.facts.size >= this.maxThreads) {
      const oldest = this.facts.keys().next().value
      if (oldest !== undefined) this.facts.delete(oldest)
    }
    list.push({ ...fact, createdAt: new Date().toISOString() })
    const rank = { high: 2, medium: 1, low: 0 }
    list.sort((a, b) => rank[b.importance] - rank[a.importance])
    this.facts.set(key, list.slice(0, this.perThread))
    return true
  }

  recall(npcId: NpcId, playerId: string): PlayerFact[] {
    return this.facts.get(`${npcId}:${playerId}`) ?? []
  }
}

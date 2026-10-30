import { Memory } from '@mastra/memory'
import type { NpcId } from '@saigon/shared'
import type { GameDb } from '../../db'

/** Recent conversation per npc+player thread, kept in injected Mastra storage. */
export const createNpcMemory = () =>
  new Memory({ options: { lastMessages: 10, generateTitle: false } })

export interface PlayerFact {
  npcId: NpcId
  playerId: string
  fact: string
  importance: 'low' | 'medium' | 'high'
  createdAt: string
}

/** The database enforces deduplication and a twelve-fact bound per thread. */
export class NpcMemoryService {
  constructor(private readonly db: GameDb) {}

  async remember(fact: Omit<PlayerFact, 'createdAt'>): Promise<boolean> {
    return this.db.rememberFact(fact)
  }

  async recall(npcId: NpcId, playerId: string): Promise<PlayerFact[]> {
    return this.db.recallFacts(npcId, playerId)
  }
}

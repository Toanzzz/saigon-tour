import type { MastraModelConfig } from '@mastra/core/llm'
import type { NpcId } from '@saigon/shared'
import { log } from '@/shared'
import type { GameDb } from '@/shared/db'
import { BoundedNpcMemory } from './bounded-memory'

/** Recent conversation per npc+player thread, kept in injected Mastra storage. */
export const createNpcMemory = (
  model: MastraModelConfig,
  messageTokens = 3000
) =>
  new BoundedNpcMemory({
    options: {
      lastMessages: 40,
      generateTitle: false,
      observationalMemory: {
        scope: 'thread',
        model,
        hooks: {
          onObservationEnd: ({ usage }) => {
            log('npc_observation', JSON.stringify(usage ?? {}))
          },
          onReflectionEnd: ({ usage }) => {
            log('npc_reflection', JSON.stringify(usage ?? {}))
          },
        },
        observation: {
          messageTokens,
          maxRetries: 0,
          failurePolicy: 'continue',
          modelSettings: { maxOutputTokens: 2000 },
          providerOptions: { meta: { reasoningEffort: 'minimal' } },
          instruction:
            'Keep promises, preferences, gifts, errands given, completed or declined, and the player tone. Drop small talk.',
        },
        reflection: {
          observationTokens: 2000,
          modelSettings: { maxOutputTokens: 2000 },
          providerOptions: { meta: { reasoningEffort: 'minimal' } },
        },
      },
    },
  })

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

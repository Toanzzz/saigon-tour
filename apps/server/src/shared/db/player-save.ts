import type { CompletedQuest, Quest, WorldState } from '@saigon/shared'

export interface PlayerSave {
  revision: number
  world: WorldState
  quests: Quest[]
  completed: CompletedQuest[]
  reputation: number
}
export interface SqlClient {
  query(
    text: string,
    values?: unknown[]
  ): Promise<{ rows: Record<string, unknown>[] }>
}

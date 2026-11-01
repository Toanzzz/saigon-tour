import type {
  CompletedQuest,
  FriendshipMap,
  Quest,
  Unlocks,
  WorldState,
} from '@saigon/shared'

export interface PlayerSave {
  friendship: FriendshipMap
  revision: number
  world: WorldState
  quests: Quest[]
  completed: CompletedQuest[]
  reputation: number
  unlocks: Unlocks
}
export interface SqlClient {
  query(
    text: string,
    values?: unknown[]
  ): Promise<{ rows: Record<string, unknown>[] }>
}

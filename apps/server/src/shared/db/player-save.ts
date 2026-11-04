import type {
  CompletedQuest,
  FriendshipMap,
  Quest,
  Unlocks,
  WorldState,
} from '@saigon/shared'
import { EMPTY_UNLOCKS, STARTING_CURRENCY } from '@saigon/shared'

export const initialPlayerSave = (): PlayerSave => ({
  friendship: {},
  revision: 0,
  world: {
    locationId: 'market',
    inventory: {},
    visitedLocations: ['market'],
    talkedTo: [],
    deliveredItems: [],
    completedQuestIds: [],
    currency: STARTING_CURRENCY,
  },
  quests: [],
  completed: [],
  reputation: 0,
  unlocks: structuredClone(EMPTY_UNLOCKS),
})

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

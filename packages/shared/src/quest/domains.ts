import type { LocationId } from '../entities'
import { QUEST_DOMAINS, type QuestDomain } from '../npcs/derive'

export type { QuestDomain }
export { QUEST_DOMAINS }

/** Authored location centres, shared by deterministic reward calculations. */
export const QUEST_LOCATION_POSITIONS: Record<LocationId, [number, number]> = {
  market: [-23, 3.5],
  park: [24, -5],
  cathedral: [88, -72],
  cityhall: [69, -12],
  river: [23, 29],
  opera: [92, -35],
  postoffice: [100, -84],
  alley: [-24, 28],
}

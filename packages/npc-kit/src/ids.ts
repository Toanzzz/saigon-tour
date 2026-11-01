/** Canonical NPC, location, item, and locale identifiers. The leaf of the NPC graph: no deps, no zod. */

export const NEIGHBOR_IDS = [
  'hoa',
  'tam',
  'linh',
  'ba',
  'mai',
  'alex',
  'vy',
  'son',
  'thao',
] as const
export type NeighborId = (typeof NEIGHBOR_IDS)[number]

export const RESIDENT_IDS = [
  'bread-vendor',
  'fruit-vendor',
  'market-browse',
  'market-walk',
  'market-family',
  'coffee-friend',
  'coffee-reader',
  'commuter',
  'student',
  'park-reader',
  'park-stretch',
  'plaza-friends',
  'plaza-stroll',
  'opera-visitor',
  'postcard-reader',
  'square-tourist',
  'riverside-friends',
  'river-jogger',
  'alley-vendor',
  'alley-diner',
] as const
export type ResidentId = (typeof RESIDENT_IDS)[number]

export const NPC_IDS = [...NEIGHBOR_IDS, ...RESIDENT_IDS] as const
export type NpcId = (typeof NPC_IDS)[number]

export const LOCATION_IDS = [
  'market',
  'park',
  'cathedral',
  'cityhall',
  'river',
  'opera',
  'postoffice',
  'alley',
] as const
export type LocationId = (typeof LOCATION_IDS)[number]

export const ITEM_IDS = [
  'herbs',
  'postcard',
  'photo',
  'noodles',
  'broth',
  'baguette',
  'coffee',
  'banana',
  'cake',
  'coffee-beans',
  'sheet-music',
  'lanterns',
] as const
export type ItemId = (typeof ITEM_IDS)[number]

/** Items that wobble while carried (Phase 1b). */
export const FRAGILE_ITEM_IDS = ['cake'] as const
export type FragileItemId = (typeof FRAGILE_ITEM_IDS)[number]

export const MARKET_ITEM_IDS = ['coffee', 'banana'] as const
export type MarketItemId = (typeof MARKET_ITEM_IDS)[number]

export const MILESTONE_IDS = ['evening-concert'] as const
export type MilestoneId = (typeof MILESTONE_IDS)[number]

export const LOCALES = ['en', 'vi'] as const
export type Locale = (typeof LOCALES)[number]

import type { ItemId, LocationId, NpcId } from '../entities'

export interface QuestDomain {
  home: LocationId
  locations: LocationId[]
  npcs: NpcId[]
  items: ItemId[]
  gifts: ItemId[]
}

/** Persona boundaries are enforced by the engine as well as the agent prompt. */
export const QUEST_DOMAINS: Record<NpcId, QuestDomain> = {
  hoa: {
    home: 'market',
    locations: ['market', 'park', 'alley', 'cityhall'],
    npcs: ['linh', 'mai', 'tam', 'vy'],
    items: ['herbs', 'noodles', 'broth', 'baguette', 'coffee', 'banana'],
    gifts: ['postcard', 'coffee'],
  },
  tam: {
    home: 'market',
    locations: ['market', 'park', 'river', 'cityhall'],
    npcs: ['hoa', 'linh', 'ba', 'mai'],
    items: ['coffee', 'banana', 'postcard'],
    gifts: ['coffee', 'postcard'],
  },
  linh: {
    home: 'park',
    locations: ['park', 'market', 'cathedral', 'cityhall'],
    npcs: ['hoa', 'tam', 'mai', 'vy', 'thao'],
    items: ['herbs', 'noodles', 'broth', 'baguette', 'banana', 'postcard'],
    gifts: ['postcard', 'banana'],
  },
  ba: {
    home: 'river',
    locations: ['river', 'market', 'cityhall', 'opera'],
    npcs: ['tam', 'hoa', 'alex', 'son'],
    items: ['postcard', 'photo', 'coffee'],
    gifts: ['postcard', 'photo'],
  },
  mai: {
    home: 'market',
    locations: ['market', 'alley', 'park', 'postoffice'],
    npcs: ['hoa', 'tam', 'linh', 'son'],
    items: ['coffee', 'banana', 'baguette', 'postcard'],
    gifts: ['coffee', 'banana'],
  },
  alex: {
    home: 'opera',
    locations: ['opera', 'cathedral', 'postoffice', 'river', 'cityhall'],
    npcs: ['thao', 'son', 'vy', 'ba'],
    items: ['photo', 'postcard', 'coffee'],
    gifts: ['photo', 'postcard'],
  },
  vy: {
    home: 'cityhall',
    locations: ['cityhall', 'alley', 'market', 'opera'],
    npcs: ['hoa', 'mai', 'thao', 'alex'],
    items: ['postcard', 'photo', 'coffee', 'banana'],
    gifts: ['coffee', 'postcard'],
  },
  son: {
    home: 'postoffice',
    locations: ['postoffice', 'river', 'cathedral', 'market', 'opera'],
    npcs: ['alex', 'ba', 'thao', 'mai'],
    items: ['postcard', 'photo', 'coffee'],
    gifts: ['photo', 'postcard'],
  },
  thao: {
    home: 'opera',
    locations: ['opera', 'cathedral', 'cityhall', 'park'],
    npcs: ['alex', 'vy', 'son', 'linh'],
    items: ['postcard', 'photo', 'coffee'],
    gifts: ['postcard', 'photo'],
  },
}

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

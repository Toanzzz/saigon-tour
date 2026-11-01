import type { LocationId, NeighborId, NpcId } from '../entities'
import { NPC_POSITIONS } from '../multiplayer'
import { NPCS } from '../world'
import type { CityEvent, CitySnapshot } from './schema'

export type CityPosition = [number, number, number]

/** Authored sidewalk anchors: agent actions select names, never coordinates. */
export const CITY_ANCHORS: Record<LocationId, Record<string, CityPosition>> = {
  market: {
    hoa: [-23, 0, 3.5],
    tam: [-12, 0, 10],
    mai: [-30, 0, 8],
    gathering: [-17, 0, 8],
  },
  park: { linh: [24, 0, -5], gathering: [21, 0, -1] },
  cathedral: { gathering: [88, 0, -62], steps: [83, 0, -68] },
  cityhall: { vy: [64, 0, -18], gathering: [66, 0, -12] },
  river: { ba: [23, 0, 29], gathering: [18, 0, 32] },
  opera: {
    alex: [92, 0, -38],
    thao: [94, 0, -31],
    gathering: [87, 0, -31],
  },
  postoffice: { son: [103, 0, -78], gathering: [101, 0, -73] },
  alley: { gathering: [-24, 0, 28], entrance: [-18, 0, 28] },
}

export function initialCitySnapshot(): CitySnapshot {
  const npcPlacements = {} as CitySnapshot['npcPlacements']
  for (const npcId of Object.keys(NPC_POSITIONS) as NeighborId[]) {
    npcPlacements[npcId] = {
      locationId: NPCS[npcId].location,
      anchorId: npcId,
      position: [...NPC_POSITIONS[npcId]],
    }
  }
  return {
    revision: 0,
    npcPlacements,
    events: [],
    needs: {},
    weather: 'clear',
    headlines: [],
  }
}
export const initialCity = initialCitySnapshot

/**
 * The event this NPC is currently hosting or tied up with: an active event at
 * the NPC's current location while the NPC also has a city need. Used to make
 * greetings and hints reflect that the NPC is busy with that event.
 */
export function hostingEvent(
  city: CitySnapshot | null | undefined,
  npcId: NpcId
): CityEvent | null {
  if (!city || NPCS[npcId].kind !== 'neighbor') return null
  const neighbor = npcId as NeighborId
  if (!city.needs[neighbor]) return null
  const location =
    city.npcPlacements[neighbor]?.locationId ?? NPCS[npcId].location
  return city.events.find((event) => event.locationId === location) ?? null
}

/**
 * Neighbors relevant to a city event: those currently placed at the event's
 * location (or whose home is there), plus anyone the event hands a need. These
 * are the NPCs a Director signals to prepare a state-aware greeting.
 */
export function relevantNpcsForEvent(
  city: CitySnapshot,
  event: CityEvent
): NeighborId[] {
  const relevant = new Set<NeighborId>()
  for (const npcId of Object.keys(NPCS) as NpcId[]) {
    if (NPCS[npcId].kind !== 'neighbor') continue
    const neighbor = npcId as NeighborId
    const at = city.npcPlacements[neighbor]?.locationId ?? NPCS[npcId].location
    if (at === event.locationId) relevant.add(neighbor)
  }
  for (const neighbor of Object.keys(city.needs) as NeighborId[])
    relevant.add(neighbor)
  return [...relevant]
}

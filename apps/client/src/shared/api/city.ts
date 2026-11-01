import {
  type CityHeadline,
  type CitySnapshot,
  CitySnapshotSchema,
  initialCity,
  type LocationId,
  type NeighborId,
  NPC_POSITIONS,
  NPCS,
  type NpcId,
} from '@saigon/shared'
import { Store } from '@tanstack/store'
import { notify } from '@/shared/state/game'
import { npcPoses } from '@/shared/world/npc-pose'
import { PEOPLE, placeName } from '@/shared/world/places'

export const city = new Store<CitySnapshot>(initialCity())
export function resetCity() {
  city.setState(() => initialCity())
}
export function applyCity(input: CitySnapshot) {
  const parsed = CitySnapshotSchema.safeParse(input)
  if (!parsed.success) return
  const snapshot = parsed.data
  if (snapshot.revision < city.state.revision) return
  const started = snapshot.events.find(
    (event) => !city.state.events.some((entry) => entry.id === event.id)
  )
  if (started) notify(`${started.title} · ${placeName(started.locationId)}`)
  city.setState((state) =>
    snapshot.revision < state.revision ? state : snapshot
  )
}
export function cityHeadline(headline: CityHeadline) {
  city.setState((state) => ({
    ...state,
    headlines: [
      ...state.headlines.filter((entry) => entry.id !== headline.id),
      headline,
    ].slice(-12),
  }))
  notify(headline.text)
}
export function npcPosition(npcId: NpcId): [number, number, number] {
  if (NPCS[npcId].kind === 'resident')
    return npcPoses.get(npcId) ?? PEOPLE[npcId].at
  return (
    city.state.npcPlacements[npcId as NeighborId]?.position ??
    NPC_POSITIONS[npcId as NeighborId]
  )
}

/**
 * The location a neighbor is currently placed at when the Director moved them
 * off their home; null when they are home or not a neighbor. Drives the
 * "now at {place}" suffix on quest steps.
 */
export function npcPlacement(npcId: NpcId): LocationId | null {
  if (NPCS[npcId].kind !== 'neighbor') return null
  const placement = city.state.npcPlacements[npcId as NeighborId]
  if (!placement) return null
  return placement.locationId === NPCS[npcId].location
    ? null
    : placement.locationId
}

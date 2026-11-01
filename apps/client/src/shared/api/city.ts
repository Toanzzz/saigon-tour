import {
  type CityHeadline,
  type CitySnapshot,
  CitySnapshotSchema,
  initialCity,
  NPC_POSITIONS,
  type NpcId,
} from '@saigon/shared'
import { Store } from '@tanstack/store'
import { notify } from '@/shared/state/game'

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
  if (started) notify(`${started.title} · ${started.locationId}`)
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
  return city.state.npcPlacements[npcId]?.position ?? NPC_POSITIONS[npcId]
}

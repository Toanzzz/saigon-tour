import { type LocationId, NPC_LOOKS, type NpcId } from '@saigon/shared'
import { m } from '@/shared/i18n'

export type Point = [number, number, number]
export const SPAWN: Point = [-23, 0.9, 10]
export const PEOPLE: Record<
  NpcId,
  { at: Point; model: string; color: string }
> = Object.fromEntries(
  Object.values(NPC_LOOKS).map((look) => [
    look.id,
    {
      at: [
        look.at[0],
        look.kind === 'neighbor' ? 0 : 0.12,
        look.at[1],
      ] as Point,
      model: look.body === 'own' ? 'female-b' : look.body,
      color: look.color,
    },
  ])
) as Record<NpcId, { at: Point; model: string; color: string }>

export const PLACES: Record<
  LocationId,
  { at: Point; stop: Point; label: string }
> = {
  market: {
    at: [-23, 0, 3.5],
    stop: [-10, 0, 12],
    label: 'BẾN THÀNH',
  },
  park: {
    at: [24, 0, -5],
    stop: [19, 0, 1],
    label: 'CÔNG VIÊN',
  },
  cityhall: {
    at: [69, 0, -12],
    stop: [60, 0, 12],
    label: 'TÒA THỊ CHÍNH',
  },
  cathedral: {
    at: [88, 0, -72],
    stop: [88, 0, -58],
    label: 'NHÀ THỜ ĐỨC BÀ',
  },
  river: {
    at: [23, 0, 29],
    stop: [17, 0, 29],
    label: 'BẾN SÔNG',
  },
  opera: {
    at: [92, 0, -35],
    stop: [88, 0, -35],
    label: 'NHÀ HÁT THÀNH PHỐ',
  },
  postoffice: {
    at: [100, 0, -84],
    stop: [100, 0, -74],
    label: 'BƯU ĐIỆN TRUNG TÂM',
  },
  alley: {
    at: [-24, 0, 28],
    stop: [-5, 0, 29],
    label: 'HẺM ẨM THỰC',
  },
}
export type TravelMode = 'bus' | 'metro' | 'xeom' | 'cyclo'
export const MODES: Record<TravelMode, { fare: number; speed: number }> = {
  bus: { fare: 5, speed: 10 },
  xeom: { fare: 8, speed: 13 },
  cyclo: { fare: 3, speed: 5.5 },
  metro: { fare: 6, speed: 15 },
}
export const distance = (a: Point, b: Point) =>
  Math.hypot(a[0] - b[0], a[2] - b[2])

/** Localized place name; call at render time, never at module scope. */
export function placeName(id: LocationId) {
  const names: Record<LocationId, () => string> = {
    market: m.place_market,
    park: m.place_park,
    cityhall: m.place_cityhall,
    cathedral: m.place_cathedral,
    river: m.place_river,
    opera: m.place_opera,
    postoffice: m.place_postoffice,
    alley: m.place_alley,
  }
  return names[id]()
}
export function modeName(mode: TravelMode) {
  const names: Record<TravelMode, () => string> = {
    bus: m.mode_bus,
    xeom: m.mode_xeom,
    cyclo: m.mode_cyclo,
    metro: m.mode_metro,
  }
  return names[mode]()
}
export function modeDescription(mode: TravelMode) {
  const descriptions: Record<TravelMode, () => string> = {
    bus: m.mode_bus_description,
    xeom: m.mode_xeom_description,
    cyclo: m.mode_cyclo_description,
    metro: m.mode_metro_description,
  }
  return descriptions[mode]()
}

/** Runtime model path for an NPC that ships its own model, else null (use the base body). */
export function ownModelPath(id: NpcId): string | null {
  return NPC_LOOKS[id]?.body === 'own' ? `npcs/${id}` : null
}

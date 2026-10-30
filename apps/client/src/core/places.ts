import type { LocationId, NpcId } from '@saigon/shared'

export type Point = [number, number, number]
export const SPAWN: Point = [-23, 0.9, 10]
export const PEOPLE: Record<
  NpcId,
  { at: Point; model: string; color: string }
> = {
  hoa: { at: [-23, 0, 3.5], model: 'female-b', color: '#f6c568' },
  tam: { at: [-12, 0, 10], model: 'male-a', color: '#85c7b6' },
  linh: { at: [24, 0, -5], model: 'female-a', color: '#ed9d86' },
  ba: { at: [23, 0, 29], model: 'male-b', color: '#eddca7' },
}
export const PLACES: Record<
  LocationId,
  { name: string; at: Point; stop: Point; label: string }
> = {
  market: {
    name: 'Bến Thành Market',
    at: [-23, 0, 3.5],
    stop: [-10, 0, 12],
    label: 'BẾN THÀNH',
  },
  park: {
    name: 'The neighborhood park',
    at: [24, 0, -5],
    stop: [19, 0, 1],
    label: 'CÔNG VIÊN',
  },
  cathedral: {
    name: 'Cathedral square',
    at: [27, 0, -23],
    stop: [18, 0, -23],
    label: 'NHÀ THỜ',
  },
  river: {
    name: 'Sài Gòn riverside',
    at: [23, 0, 29],
    stop: [17, 0, 29],
    label: 'BẾN SÔNG',
  },
}
export type TravelMode = 'bus' | 'metro' | 'xeom' | 'cyclo'
export const MODES: Record<
  TravelMode,
  { name: string; fare: number; speed: number; description: string }
> = {
  bus: {
    name: 'City bus',
    fare: 5,
    speed: 6.8,
    description: 'A window seat through the neighborhood',
  },
  xeom: {
    name: 'Xe ôm',
    fare: 8,
    speed: 9,
    description: 'A quick ride with Anh Tâm',
  },
  cyclo: {
    name: 'Xích lô',
    fare: 3,
    speed: 4.6,
    description: 'Slow down and take in the city',
  },
  metro: {
    name: 'Metro',
    fare: 6,
    speed: 11,
    description: 'Glide between the northern stations',
  },
}
export function route(from: LocationId, to: LocationId): Point[] {
  const a = PLACES[from].stop
  const b = PLACES[to].stop
  return ([a, [8, 0, a[2]], [8, 0, b[2]], b] as Point[]).filter(
    (point, index, points) =>
      index === 0 ||
      Math.hypot(
        point[0] - points[index - 1][0],
        point[2] - points[index - 1][2]
      ) > 0.1
  )
}
export const distance = (a: Point, b: Point) =>
  Math.hypot(a[0] - b[0], a[2] - b[2])

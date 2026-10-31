import { type LocationId, NPC_POSITIONS, type NpcId } from '@saigon/shared'

export type Point = [number, number, number]
export const SPAWN: Point = [-23, 0.9, 10]
export const PEOPLE: Record<
  NpcId,
  { at: Point; model: string; color: string }
> = {
  hoa: { at: NPC_POSITIONS.hoa, model: 'female-b', color: '#f6c568' },
  tam: { at: NPC_POSITIONS.tam, model: 'male-a', color: '#85c7b6' },
  linh: { at: NPC_POSITIONS.linh, model: 'female-a', color: '#ed9d86' },
  ba: { at: NPC_POSITIONS.ba, model: 'male-b', color: '#eddca7' },
  mai: { at: NPC_POSITIONS.mai, model: 'female-b', color: '#baddc1' },
  alex: { at: NPC_POSITIONS.alex, model: 'male-a', color: '#c6b5e5' },
  vy: { at: NPC_POSITIONS.vy, model: 'female-a', color: '#e6a56e' },
  son: { at: NPC_POSITIONS.son, model: 'male-b', color: '#8fc2d1' },
  thao: { at: NPC_POSITIONS.thao, model: 'female-b', color: '#d5a8c9' },
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
  cityhall: {
    name: 'Tòa Thị Chính',
    at: [69, 0, -12],
    stop: [60, 0, 12],
    label: 'TÒA THỊ CHÍNH',
  },
  cathedral: {
    name: 'Nhà thờ Đức Bà',
    at: [88, 0, -72],
    stop: [88, 0, -58],
    label: 'NHÀ THỜ ĐỨC BÀ',
  },
  river: {
    name: 'Sài Gòn riverside',
    at: [23, 0, 29],
    stop: [17, 0, 29],
    label: 'BẾN SÔNG',
  },
  opera: {
    name: 'Saigon Opera House',
    at: [92, 0, -35],
    stop: [88, 0, -35],
    label: 'NHÀ HÁT THÀNH PHỐ',
  },
  postoffice: {
    name: 'Central Post Office',
    at: [100, 0, -84],
    stop: [100, 0, -74],
    label: 'BƯU ĐIỆN TRUNG TÂM',
  },
  alley: {
    name: 'Bùi Viện food alley',
    at: [-24, 0, 28],
    stop: [-5, 0, 29],
    label: 'HẺM ẨM THỰC',
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
    speed: 10,
    description: 'A window seat through the neighborhood',
  },
  xeom: {
    name: 'Xe ôm',
    fare: 8,
    speed: 13,
    description: 'A quick ride with Anh Tâm',
  },
  cyclo: {
    name: 'Xích lô',
    fare: 3,
    speed: 5.5,
    description: 'Slow down and take in the city',
  },
  metro: {
    name: 'Metro',
    fare: 6,
    speed: 15,
    description:
      'Express through the cultural core, from market to Post Office',
  },
}
export const distance = (a: Point, b: Point) =>
  Math.hypot(a[0] - b[0], a[2] - b[2])

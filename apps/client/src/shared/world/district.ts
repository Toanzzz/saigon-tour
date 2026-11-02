/**
 * Compressed District 1 layout derived from OpenStreetMap coordinates, with
 * Chợ Bến Thành at the origin. Game +x follows Lê Lợi (real bearing 45°);
 * Nguyễn Huệ and Đồng Khởi run toward the river along +z (bearing 135°), so
 * real north points toward (+x, −z). Street order and landmark bearings match
 * the real city; distances are shortened so every stop is a short walk.
 *
 * Real offsets from the market: Tòa Thị Chính 550 m at 35°, Nhà thờ Đức Bà
 * 810 m at 7°, Bạch Đằng riverfront 1.1 km at 64°. In game frame those become
 * (+540, −95), (+643, −494), and (+1031, +349) metres before compression.
 */
export type Rect = { x: number; z: number; w: number; d: number }
export type Vec3 = [number, number, number]

/** Map arrow angle: real north relative to game −z, clockwise. */
export const NORTH_ANGLE = 45

export const BOUNDS = { minX: -52, maxX: 124, minZ: -116, maxZ: 44 }
export const GROUND: Rect[] = [
  { x: 36, z: 0, w: 176, d: 96 },
  { x: 95, z: -82, w: 58, d: 68 },
]
export const ROADS: (Rect & { name?: string })[] = [
  { x: 29, z: 12, w: 158, d: 7, name: 'LÊ LỢI' },
  { x: 8, z: -2, w: 7, d: 84 },
  { x: 14.5, z: 1, w: 13, d: 4 },
  { x: 7, z: 29, w: 25, d: 4 },
  { x: 75, z: -16, w: 66, d: 6, name: 'LÊ THÁNH TÔN' },
  { x: 88, z: -24, w: 6, d: 79, name: 'ĐỒNG KHỞI' },
  { x: 96, z: -62, w: 36, d: 6 },
  { x: 100, z: -72, w: 6, d: 26, name: 'CÔNG XÃ PARIS' },
]
/** Pedestrian paving: Nguyễn Huệ, the City Hall forecourt, Công xã Paris. */
export const PLAZAS: (Rect & { name?: string })[] = [
  { x: 69, z: -2, w: 14, d: 22, name: 'NGUYỄN HUỆ' },
  { x: 69, z: 24, w: 14, d: 16 },
  { x: 69, z: -19, w: 26, d: 3 },
  { x: 88, z: -72, w: 18, d: 16, name: 'CÔNG XÃ PARIS' },
  { x: 91, z: -35, w: 5, d: 17, name: 'NHÀ HÁT' },
  { x: 99, z: -84, w: 5, d: 14, name: 'BƯU ĐIỆN' },
  { x: -24, z: 28, w: 46, d: 6, name: 'HẺM ẨM THỰC' },
]
export const PARK: Rect = { x: 27, z: -9, w: 22, d: 16 }
export const MARKET: Rect = { x: -23, z: -12, w: 24, d: 20 }
export const WATER: Rect = { x: 28, z: 52, w: 210, d: 24 }
export const CULTURAL_FOOTPRINTS = {
  opera: { x: 101, z: -35, w: 12, d: 14 },
  postoffice: { x: 112, z: -84, w: 12, d: 18 },
}

export const LANDMARKS = {
  cityhall: {
    model: 'landmarks/toa-thi-chinh',
    position: [69, 0, -26] as Vec3,
    scale: 24,
    footprint: { x: 69, z: -26, w: 23.5, d: 11 },
  },
  cathedral: {
    model: 'landmarks/nha-tho-duc-ba',
    position: [88, 0, -95] as Vec3,
    scale: 26,
    footprint: { x: 88, z: -95, w: 15, d: 25.5 },
  },
}

/** Boundary walls as [centre x, centre z, half x, half z]. */
export const WALLS: [number, number, number, number][] = [
  [-48.5, -4, 0.5, 42.5],
  [11, -46.5, 59, 0.5],
  [70.5, -79, 0.5, 33],
  [95, -112.5, 25, 0.5],
  [121.5, -37, 0.5, 76],
  [36.5, 39.2, 85.5, 0.5],
]

/**
 * Phase-2 landmark icons that occupy a former `buildingRows` slot. Each rect
 * is drawn on the minimap in the landmark fill, linted by city-layout.spec,
 * and backed by a solid in solids.ts. Scenery only — no `LocationId` changes.
 */
export const ICON_FOOTPRINTS = {
  /** Bitexco: lotus-bud tower near the river end of Nguyễn Huệ. */
  bitexco: { x: 57, z: 29, w: 6.4, d: 6.4 },
  /** 42 Nguyễn Huệ café-apartments: 9-storey block facing the plaza. */
  cafeApartments: { x: 57, z: -8, w: 6, d: 5 },
} as const

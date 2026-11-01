import { CULTURAL_FOOTPRINTS, LANDMARKS, type Rect, WALLS } from './district'
import { FOOTPRINTS } from './footprints.generated'
import { buildingRows } from './layout'
import { BENCH_PLACEMENTS, FOUNTAIN, PALM_XZ, TREE_XZ } from './placements'
import { STREET_PROPS_COLLIDERS } from './street-life'

/**
 * One source of truth for every solid in the city. The same list feeds the
 * runtime colliders (collision.tsx), the layout lint (test/city-layout.spec.ts)
 * and the `?debug` overlay, so visuals and collision cannot drift apart.
 *
 * Every solid is axis-aligned: `yaw` is a multiple of π/2, and `hx`/`hz`
 * already describe the world-space half-extents after that rotation.
 */
export type SolidKind = 'building' | 'landmark' | 'cultural' | 'prop' | 'wall'
export type Solid = {
  id: string
  kind: SolidKind
  /** World centre of the footprint. */
  x: number
  z: number
  /** World-space half-extents (already rotated by `yaw`). */
  hx: number
  hz: number
  /** Full height; the collider runs from the ground up to `h`. */
  h: number
  /** Multiple of π/2, kept for the debug overlay. */
  yaw: number
}

const HALF_PI = Math.PI / 2
/** Snap yaw to a quarter turn and report whether it swaps the x/z extents. */
function quarterTurn(yaw: number) {
  const turns = ((Math.round(yaw / HALF_PI) % 4) + 4) % 4
  return { swaps: turns % 2 === 1, yaw: turns * HALF_PI }
}

export type ModelPlacement = {
  x: number
  z: number
  scale: number
  yaw: number
}

/**
 * A solid from a runtime model's measured bounds. The collider matches the
 * visual footprint, including the bbox centre offset — this is what fixes the
 * market, whose model is asymmetric in z.
 */
export function fromModel(
  id: string,
  kind: SolidKind,
  path: string,
  { x, z, scale, yaw }: ModelPlacement,
  height?: number
): Solid {
  const bounds = FOOTPRINTS[path]
  if (!bounds) throw new Error(`No footprint for ${path}`)
  const [minX, , minZ] = bounds.min
  const [maxX, maxY, maxZ] = bounds.max
  const localHx = ((maxX - minX) / 2) * scale
  const localHz = ((maxZ - minZ) / 2) * scale
  const localCx = ((maxX + minX) / 2) * scale
  const localCz = ((maxZ + minZ) / 2) * scale
  const { swaps, yaw: snapped } = quarterTurn(yaw)
  const cos = Math.round(Math.cos(snapped))
  const sin = Math.round(Math.sin(snapped))
  return {
    id,
    kind,
    x: x + localCx * cos + localCz * sin,
    z: z - localCx * sin + localCz * cos,
    hx: swaps ? localHz : localHx,
    hz: swaps ? localHx : localHz,
    h: height ?? maxY * scale,
    yaw: snapped,
  }
}

/** A solid from a hand-authored rect (landmark/cultural footprints, props). */
export function fromRect(
  id: string,
  kind: SolidKind,
  rect: Rect,
  h: number
): Solid {
  return {
    id,
    kind,
    x: rect.x,
    z: rect.z,
    hx: rect.w / 2,
    hz: rect.d / 2,
    h,
    yaw: 0,
  }
}

const BUILDING_PATH: Record<string, string> = {
  a: 'city/building-a',
  c: 'city/building-c',
  e: 'city/building-e',
  f: 'city/building-f',
  g: 'city/building-g',
  j: 'city/building-j',
}

export const BUILDING_SOLIDS: Solid[] = buildingRows.map((row, index) =>
  fromModel(
    `building-${row.type}-${index}`,
    'building',
    BUILDING_PATH[row.type],
    { x: row.x, z: row.z, scale: row.scale, yaw: row.yaw },
    8
  )
)

const landmarks: Solid[] = [
  fromModel(
    'market',
    'landmark',
    'landmarks/cho-ben-thanh',
    { x: -23, z: -12, scale: 0.7, yaw: 0 },
    12
  ),
  fromRect('cityhall', 'landmark', LANDMARKS.cityhall.footprint, 12),
  fromRect('cathedral', 'landmark', LANDMARKS.cathedral.footprint, 12),
]

const cultural: Solid[] = [
  fromRect('opera', 'cultural', CULTURAL_FOOTPRINTS.opera, 12),
  fromRect('postoffice', 'cultural', CULTURAL_FOOTPRINTS.postoffice, 12),
]

const trees: Solid[] = [...PALM_XZ, ...TREE_XZ].map(([x, z], i) => ({
  id: `tree-${i}`,
  kind: 'prop' as const,
  x,
  z,
  hx: 0.25,
  hz: 0.25,
  h: 4,
  yaw: 0,
}))

const benches: Solid[] = BENCH_PLACEMENTS.map(({ x, z, yaw }, i) => {
  const { swaps } = quarterTurn(yaw)
  return {
    id: `bench-${i}`,
    kind: 'prop' as const,
    x,
    z,
    hx: swaps ? 0.5 : 1.4,
    hz: swaps ? 1.4 : 0.5,
    h: 1.2,
    yaw,
  }
})

const marketStall: Solid = {
  id: 'market-stall',
  kind: 'prop',
  x: -23,
  z: 1.35,
  hx: 1.95,
  hz: 0.7,
  h: 1.2,
  yaw: 0,
}

const fountain: Solid = {
  id: 'fountain',
  kind: 'prop',
  x: FOUNTAIN.x,
  z: FOUNTAIN.z,
  hx: FOUNTAIN.r,
  hz: FOUNTAIN.r,
  h: 1.6,
  yaw: 0,
}

const streetProps: Solid[] = STREET_PROPS_COLLIDERS.map((f, i) => ({
  id: `street-prop-${i}`,
  kind: 'prop' as const,
  x: f.x,
  z: f.z,
  hx: f.w / 2,
  hz: f.d / 2,
  h: f.h,
  yaw: 0,
}))

const walls: Solid[] = WALLS.map(([x, z, hx, hz], i) => ({
  id: `wall-${i}`,
  kind: 'wall' as const,
  x,
  z,
  hx,
  hz,
  h: 16,
  yaw: 0,
}))

export const SOLIDS: Solid[] = [
  ...BUILDING_SOLIDS,
  ...landmarks,
  ...cultural,
  ...trees,
  ...benches,
  marketStall,
  fountain,
  ...streetProps,
  ...walls,
]

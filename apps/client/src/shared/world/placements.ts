import type { Placement } from './assets'

/**
 * Shared prop placements. The renderer and the solids registry both read these
 * arrays, so a prop's visual and its collider cannot drift apart.
 */

export const PALM_XZ: [number, number][] = [
  [-38, -25],
  [-8, -24],
  [-38, -1],
  [-8, 1],
  [13, -34],
  [13, -16],
  [38, -17],
  [38, 4],
  [-37, 32],
  [-23, 32],
  [-8, 32],
  [6, 32],
  [35, 32],
  [13, 23],
  [36, 23],
  [52, 32],
  [86, 32],
  [64, -6],
  [74, -6],
  [64, 4],
  [74, 4],
  [64, 21],
  [74, 21],
  [82, -64],
  [94, -64],
]
export const TREE_XZ: [number, number][] = [
  [19, -13],
  [35, -13],
  [34, -2],
  [20, -3],
  [30, 1],
  [20, -8],
  [-4, -23],
  [93, -40],
  [93, -30],
  [83, -50],
]
export const STREET_LIGHT_XS = [-35, -20, -5, 20, 35, 50, 82, 100]

export const PALM_PLACEMENTS: Placement[] = PALM_XZ.map(([x, z], i) => ({
  position: [x, 0.1, z],
  scale: 4.1 + (i % 3) * 0.3,
  rotation: [0, i * 1.74, 0],
}))
export const TREE_PLACEMENTS: Placement[] = TREE_XZ.map(([x, z], i) => ({
  position: [x, 0.15, z],
  scale: 3.7 + (i % 2) * 0.8,
}))
export const STREET_LIGHT_PLACEMENTS: Placement[] = STREET_LIGHT_XS.flatMap(
  (x) => [
    {
      position: [x, 0, 6.7],
      scale: 6.2,
      rotation: [0, Math.PI, 0],
    } as Placement,
    { position: [x, 0, 17.3], scale: 6.2 } as Placement,
  ]
)

/** Park benches that carry a collider; `yaw` is a multiple of π/2. */
export const BENCH_PLACEMENTS: { x: number; z: number; yaw: number }[] = [
  { x: 34, z: -12, yaw: Math.PI / 2 },
  { x: 19, z: -12, yaw: Math.PI / 2 },
  { x: 24, z: 33, yaw: 0 },
  { x: -27, z: 35, yaw: 0 },
]

/** Park fountain footprint (circular, approximated as a square collider). */
export const FOUNTAIN = { x: 30, z: -11, r: 2.5 }

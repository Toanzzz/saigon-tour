import type { Placement, Vec3 } from './assets'

/**
 * Lit heritage-window placements, authored per façade as world-space offsets
 * from each building footprint (`district.ts` CULTURAL_FOOTPRINTS / LANDMARKS).
 * Phase 4 mounts one unlit `InstancedMesh` of warm `window3000k` quads from
 * these at dusk; the day baseline never draws them. City Hall gets windows
 * only — the milestone lanterns live in `features/city/events.tsx`, untouched.
 *
 * Each quad is a thin box (depth 0.06) pushed just off the façade plane so it
 * reads as a glowing pane. Positions are hand-placed against the rendered
 * massing in `cultural.tsx` and the landmark models, not the raw footprint.
 */

type Façade = {
  /** Building footprint centre. */
  centre: [number, number]
  /** Façade normal in world space: which way the lit face points. */
  face: 'px' | 'nx' | 'pz' | 'nz'
  /** Quad half-size (w, h). */
  pane: [number, number]
  /** Column offsets along the façade (local horizontal) and row heights. */
  cols: number[]
  rows: number[]
  /** Distance from centre to the façade plane along the normal. */
  depth: number
}

/** Build world placements for a grid of panes on one façade. */
function facadeWindows({ centre, face, pane, cols, rows, depth }: Façade) {
  const [cx, cz] = centre
  const [hw, hh] = pane
  const out: Placement[] = []
  for (const row of rows) {
    for (const col of cols) {
      let position: Vec3
      let scale: Vec3
      if (face === 'px' || face === 'nx') {
        const sign = face === 'px' ? 1 : -1
        position = [cx + sign * depth, row, cz + col]
        scale = [0.06, hh, hw]
      } else {
        const sign = face === 'pz' ? 1 : -1
        position = [cx + col, row, cz + sign * depth]
        scale = [hw, hh, 0.06]
      }
      out.push({ position, scale })
    }
  }
  return out
}

/**
 * Cathedral (`LANDMARKS.cathedral`, centre 88,−95, front faces +z toward the
 * square). Three tall nave windows on the front, two on each flank.
 */
const cathedral: Placement[] = [
  ...facadeWindows({
    centre: [88, -95],
    face: 'pz',
    pane: [0.9, 2.1],
    cols: [-3.4, 0, 3.4],
    rows: [4.6, 8.2],
    depth: 7.6,
  }),
  ...facadeWindows({
    centre: [88, -95],
    face: 'px',
    pane: [0.8, 1.8],
    cols: [-6, 0, 6],
    rows: [4.4],
    depth: 6,
  }),
  ...facadeWindows({
    centre: [88, -95],
    face: 'nx',
    pane: [0.8, 1.8],
    cols: [-6, 0, 6],
    rows: [4.4],
    depth: 6,
  }),
]

/** Central Post Office (rendered at 110,−84, façade faces +x). */
const postOffice: Placement[] = facadeWindows({
  centre: [110, -84],
  face: 'px',
  pane: [0.7, 1.9],
  cols: [-5.3, -3.5, -1.5, 1.5, 3.5, 5.3],
  rows: [3.0],
  depth: 5.6,
})

/** Opera House (rendered at 99,−35, façade faces +x). */
const opera: Placement[] = facadeWindows({
  centre: [99, -35],
  face: 'px',
  pane: [0.8, 1.6],
  cols: [-4.1, -1.3, 1.3, 4.1],
  rows: [2.4, 4.5],
  depth: 5.3,
})

/**
 * City Hall (`LANDMARKS.cityhall`, centre 69,−26, forecourt faces +z). Windows
 * only — no lanterns. A two-row grid across the broad front elevation.
 */
const cityHall: Placement[] = facadeWindows({
  centre: [69, -26],
  face: 'pz',
  pane: [0.7, 1.4],
  cols: [-7, -4.5, -2, 2, 4.5, 7],
  rows: [3.2, 6.1],
  depth: 5.6,
})

/** Every lit window, batched into one mesh by the evening renderer. */
export const HERITAGE_WINDOWS: Placement[] = [
  ...cathedral,
  ...postOffice,
  ...opera,
  ...cityHall,
]

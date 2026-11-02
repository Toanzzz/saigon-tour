/**
 * Pure lane generation for the scooter swarm (map Phase 5c). No React, no
 * Three: a road rect and the bus-stop list in, a set of lane segments out.
 * Two lanes per road run in opposite directions; each lane is clipped to the
 * rect and leaves a ±`STOP_GAP` gap along its axis around any nearby stop so
 * scooters never park on a waiting pedestrian.
 */

export type Rect = { x: number; z: number; w: number; d: number; name?: string }
export type Vec2 = [number, number]

/** The axis a road runs along: the longer side. */
export type Axis = 'x' | 'z'

/** A drivable lane: a straight run with a travel direction and a span. */
export interface Lane {
  /** Road this lane belongs to, for debugging and tests. */
  road: string
  axis: Axis
  /** Fixed cross-axis coordinate (z for an x-road, x for a z-road). */
  offset: number
  /** Inclusive travel span [min, max] along the axis, after stop clipping. */
  from: number
  to: number
  /** +1 travels toward increasing axis value, −1 toward decreasing. */
  dir: 1 | -1
}

/** Half-width of the gap left around a bus stop, per the plan. */
export const STOP_GAP = 6
/** How far a lane is nudged off the road centre line. */
export const LANE_INSET = 1.4

const axisOf = (rect: Rect): Axis => (rect.w >= rect.d ? 'x' : 'z')

/** Does `[x, z]` sit inside the rect (centre + half-extents)? */
export function insideRect(rect: Rect, x: number, z: number): boolean {
  return (
    Math.abs(x - rect.x) <= rect.w / 2 && Math.abs(z - rect.z) <= rect.d / 2
  )
}

/**
 * Split `[min, max]` into the sub-spans that avoid a ±STOP_GAP hole around
 * every stop. Stops are projected onto the lane axis and sorted; each carves a
 * hole, and the gaps between holes (wider than a minimum) become drivable
 * spans. A road with stops in its interior therefore yields several short
 * lanes rather than one that drives over a waiting pedestrian.
 */
export function freeSpans(
  min: number,
  max: number,
  axisStops: number[]
): [number, number][] {
  const holes = axisStops
    .map((s) => [s - STOP_GAP, s + STOP_GAP] as [number, number])
    .sort((a, b) => a[0] - b[0])
  const spans: [number, number][] = []
  let cursor = min
  for (const [lo, hi] of holes) {
    if (lo > cursor + 1) spans.push([cursor, Math.min(lo, max)])
    cursor = Math.max(cursor, hi)
    if (cursor >= max) break
  }
  if (cursor < max - 1) spans.push([cursor, max])
  return spans
}

/**
 * Build the opposite-direction lanes for one named road: two directions, each
 * split into one lane per stop-free span. Short roads with no interior stop
 * stay at exactly two lanes.
 */
export function roadLanes(rect: Rect, stops: Vec2[]): Lane[] {
  const axis = axisOf(rect)
  const name = rect.name ?? `${rect.x},${rect.z}`
  const alongHalf = (axis === 'x' ? rect.w : rect.d) / 2
  const crossHalf = (axis === 'x' ? rect.d : rect.w) / 2
  const centreAlong = axis === 'x' ? rect.x : rect.z
  const centreCross = axis === 'x' ? rect.z : rect.x
  const min = centreAlong - alongHalf
  const max = centreAlong + alongHalf
  // Stops within the road band contribute a gap along the axis.
  const axisStops = stops
    .filter(([sx, sz]) => {
      const cross = axis === 'x' ? sz : sx
      return Math.abs(cross - centreCross) <= crossHalf + STOP_GAP
    })
    .map(([sx, sz]) => (axis === 'x' ? sx : sz))
  const spans = freeSpans(min, max, axisStops)
  const inset = Math.min(LANE_INSET, crossHalf - 0.6)
  return spans.flatMap(([from, to]) => [
    { road: name, axis, offset: centreCross - inset, from, to, dir: 1 },
    { road: name, axis, offset: centreCross + inset, from, to, dir: -1 },
  ])
}

/** World position of a scooter at parametric `t` (0..1) along a lane. */
export function lanePoint(lane: Lane, t: number): Vec2 {
  const along = lane.from + (lane.to - lane.from) * t
  return lane.axis === 'x' ? [along, lane.offset] : [lane.offset, along]
}

/** Heading (yaw) a scooter faces while driving the lane. */
export function laneHeading(lane: Lane): number {
  if (lane.axis === 'x') return lane.dir > 0 ? Math.PI / 2 : -Math.PI / 2
  return lane.dir > 0 ? 0 : Math.PI
}

/** All lanes for the named roads, in author order. */
export function buildLanes(roads: Rect[], stops: Vec2[]): Lane[] {
  return roads.filter((r) => r.name).flatMap((r) => roadLanes(r, stops))
}

import { describe, expect, it } from 'vitest'
import {
  CONE_COS,
  CONE_LENGTH,
  COOLDOWN_MS,
  inForwardCone,
  shouldHonk,
} from '@/features/city/traffic-brake'
import {
  buildLanes,
  freeSpans,
  insideRect,
  laneHeading,
  lanePoint,
  type Rect,
  STOP_GAP,
} from '@/features/city/traffic-lanes'
import { ROADS } from '@/shared/world/district'
import { PLACES } from '@/shared/world/places'

const SWARM = ['LÊ LỢI', 'LÊ THÁNH TÔN', 'ĐỒNG KHỞI']
const roads = ROADS.filter((r) => SWARM.includes(r.name ?? '')) as Rect[]
const stops = Object.values(PLACES).map(
  (p) => [p.stop[0], p.stop[2]] as [number, number]
)

describe('lane generation stays on the road and clear of stops', () => {
  const lanes = buildLanes(roads, stops)

  it('builds paired opposite lanes for every named road', () => {
    for (const road of SWARM) {
      const lane = lanes.filter((l) => l.road === road)
      expect(lane.length).toBeGreaterThanOrEqual(2)
      // Both travel directions are present.
      expect(lane.some((l) => l.dir === 1)).toBe(true)
      expect(lane.some((l) => l.dir === -1)).toBe(true)
      // Lanes come in +/- pairs, so the count is even.
      expect(lane.length % 2).toBe(0)
    }
  })

  it('every sampled lane point lies inside its road rect', () => {
    for (const lane of lanes) {
      const rect = roads.find((r) => r.name === lane.road) as Rect
      for (let t = 0; t <= 1; t += 0.1) {
        const [x, z] = lanePoint(lane, t)
        expect(insideRect(rect, x, z)).toBe(true)
      }
    }
  })

  it('excludes the ±STOP_GAP zone around any in-band bus stop', () => {
    for (const lane of lanes) {
      const rect = roads.find((r) => r.name === lane.road) as Rect
      const crossHalf = (lane.axis === 'x' ? rect.d : rect.w) / 2
      const bandStops = stops
        .filter(([sx, sz]) => {
          const cross = lane.axis === 'x' ? sz : sx
          const centreCross = lane.axis === 'x' ? rect.z : rect.x
          return Math.abs(cross - centreCross) <= crossHalf + STOP_GAP
        })
        .map(([sx, sz]) => (lane.axis === 'x' ? sx : sz))
      for (let t = 0; t <= 1; t += 0.05) {
        const [x, z] = lanePoint(lane, t)
        const along = lane.axis === 'x' ? x : z
        for (const s of bandStops)
          expect(Math.abs(along - s)).toBeGreaterThanOrEqual(STOP_GAP - 1e-6)
      }
    }
  })

  it('freeSpans carves hole-free runs around interior stops', () => {
    // A stop at the low edge pushes the first span past the gap.
    expect(freeSpans(-10, 10, [-10])).toEqual([[-4, 10]])
    expect(freeSpans(-10, 10, [10])).toEqual([[-10, 4]])
    // An interior stop splits the span into two drivable runs.
    expect(freeSpans(-10, 10, [0])).toEqual([
      [-10, -6],
      [6, 10],
    ])
  })

  it('laneHeading faces along the travel direction', () => {
    const lloi = lanes.find((l) => l.road === 'LÊ LỢI' && l.dir === 1)
    if (!lloi) throw new Error('missing Lê Lợi lane')
    expect(lloi.axis).toBe('x')
    expect(laneHeading(lloi)).toBeCloseTo(Math.PI / 2)
  })
})

describe('brake trigger fires only in the forward cone', () => {
  it('fires straight ahead within range', () => {
    // Facing +z (heading 0): a target just ahead is in the cone.
    expect(inForwardCone([0, 0], 0, [0, CONE_LENGTH - 0.5])).toBe(true)
  })

  it('ignores targets behind or beside the scooter', () => {
    expect(inForwardCone([0, 0], 0, [0, -2])).toBe(false)
    expect(inForwardCone([0, 0], 0, [3, 0])).toBe(false)
  })

  it('ignores targets beyond the cone length', () => {
    expect(inForwardCone([0, 0], 0, [0, CONE_LENGTH + 1])).toBe(false)
  })

  it('respects the cone half-angle', () => {
    // A target off to the diagonal front at 45° sits right at the threshold.
    const r = 2
    const diag = inForwardCone([0, 0], 0, [r * 0.8, r * 0.6])
    // cos between facing +z and (0.8,0.6) normalised is 0.6 < CONE_COS.
    expect(CONE_COS).toBeGreaterThan(0.6)
    expect(diag).toBe(false)
  })

  it('honks once, then waits out the cooldown', () => {
    const ahead: [number, number] = [0, 2]
    expect(shouldHonk([0, 0], 0, [ahead], -Infinity, 1000)).toBe(true)
    // 1 ms later, still cooling down.
    expect(shouldHonk([0, 0], 0, [ahead], 1000, 1001)).toBe(false)
    // After the cooldown it may honk again.
    expect(shouldHonk([0, 0], 0, [ahead], 1000, 1000 + COOLDOWN_MS)).toBe(true)
  })
})

import { CITY_ANCHORS } from '@saigon/shared'
import { describe, expect, it } from 'vitest'
import { BOUNDS, ICON_FOOTPRINTS } from '@/shared/world/district'
import { PLACES } from '@/shared/world/places'
import { SOLIDS } from '@/shared/world/solids'

/** The solids added by Phase 2 (landmark icons + giant park-tree trunks). */
const NEW_SOLID_IDS = new Set([
  'bitexco',
  'cafe-apartments',
  ...SOLIDS.filter((s) => s.id.startsWith('giant-tree-')).map((s) => s.id),
])
const newSolids = SOLIDS.filter((s) => NEW_SOLID_IDS.has(s.id))

const inside = (
  p: readonly number[],
  s: (typeof SOLIDS)[number],
  pad: number
) => Math.abs(p[0] - s.x) < s.hx + pad && Math.abs(p[2] - s.z) < s.hz + pad

describe('phase-2 landmark icons', () => {
  it('keeps every icon footprint inside the walkable BOUNDS', () => {
    const out: string[] = []
    for (const [id, f] of Object.entries(ICON_FOOTPRINTS)) {
      if (
        f.x - f.w / 2 < BOUNDS.minX ||
        f.x + f.w / 2 > BOUNDS.maxX ||
        f.z - f.d / 2 < BOUNDS.minZ ||
        f.z + f.d / 2 > BOUNDS.maxZ
      )
        out.push(id)
    }
    expect(out).toEqual([])
  })

  it('backs each icon footprint with a solid of at least its footprint area', () => {
    for (const [id, f] of Object.entries(ICON_FOOTPRINTS)) {
      const key = id === 'cafeApartments' ? 'cafe-apartments' : id
      const solid = SOLIDS.find((s) => s.id === key)
      expect(solid, `solid for ${id}`).toBeDefined()
      if (!solid) continue
      const colliderArea = solid.hx * 2 * (solid.hz * 2)
      const visualArea = f.w * f.d
      expect(colliderArea).toBeGreaterThanOrEqual(visualArea * 0.95)
    }
  })

  it('does not bury any place point in a new solid', () => {
    const points: [string, readonly number[]][] = Object.entries(
      PLACES
    ).flatMap(([id, place]) => [
      [`at:${id}`, place.at],
      [`stop:${id}`, place.stop],
    ])
    const hits: string[] = []
    for (const [name, point] of points) {
      for (const solid of newSolids) {
        if (inside(point, solid, 0.35)) hits.push(`${name} in ${solid.id}`)
      }
    }
    expect(hits).toEqual([])
  })

  it('does not bury any city anchor in a new solid', () => {
    const hits: string[] = []
    for (const [location, anchors] of Object.entries(CITY_ANCHORS)) {
      for (const [anchorId, point] of Object.entries(anchors)) {
        for (const solid of newSolids) {
          if (inside(point, solid, 0.35))
            hits.push(`${location}.${anchorId} in ${solid.id}`)
        }
      }
    }
    expect(hits).toEqual([])
  })
})

import { describe, expect, it } from 'vitest'
import {
  CULTURAL_FOOTPRINTS,
  LANDMARKS,
  MARKET,
  PARK,
  PLAZAS,
  ROADS,
} from '@/shared/world/district'
import { FOOTPRINTS } from '@/shared/world/footprints.generated'
import { buildingRows } from '@/shared/world/layout'
import { PEOPLE, PLACES, SPAWN } from '@/shared/world/places'
import { BUILDING_SOLIDS, SOLIDS } from '@/shared/world/solids'

type Box = { minX: number; maxX: number; minZ: number; maxZ: number }
const box = (s: { x: number; z: number; hx: number; hz: number }): Box => ({
  minX: s.x - s.hx,
  maxX: s.x + s.hx,
  minZ: s.z - s.hz,
  maxZ: s.z + s.hz,
})
const rectBox = (r: { x: number; z: number; w: number; d: number }): Box =>
  box({ x: r.x, z: r.z, hx: r.w / 2, hz: r.d / 2 })
const overlap = (a: Box, b: Box, margin = 0) =>
  a.minX < b.maxX - margin &&
  a.maxX > b.minX + margin &&
  a.minZ < b.maxZ - margin &&
  a.maxZ > b.minZ + margin
const inside = (p: [number, number, number], b: Box, pad: number) =>
  p[0] > b.minX - pad &&
  p[0] < b.maxX + pad &&
  p[2] > b.minZ - pad &&
  p[2] < b.maxZ + pad

const CAPSULE = 0.35
const obstacles = BUILDING_SOLIDS.map(box)
const streetFootprints: { name: string; box: Box }[] = [
  ...ROADS.map((r, i) => ({ name: r.name ?? `road-${i}`, box: rectBox(r) })),
  ...PLAZAS.map((p, i) => ({ name: p.name ?? `plaza-${i}`, box: rectBox(p) })),
  { name: 'PARK', box: rectBox(PARK) },
  { name: 'MARKET', box: rectBox(MARKET) },
  ...Object.entries(LANDMARKS).map(([id, l]) => ({
    name: id,
    box: rectBox(l.footprint),
  })),
  ...Object.entries(CULTURAL_FOOTPRINTS).map(([id, f]) => ({
    name: id,
    box: rectBox(f),
  })),
]

describe('city layout solids', () => {
  it('no building overlaps a road, plaza, landmark or the park', () => {
    const hits: string[] = []
    for (const solid of BUILDING_SOLIDS) {
      const b = box(solid)
      for (const target of streetFootprints) {
        if (overlap(b, target.box, 0.2))
          hits.push(`${solid.id}(${solid.x},${solid.z}) ↔ ${target.name}`)
      }
    }
    expect(hits).toEqual([])
  })

  it('no two buildings overlap each other', () => {
    const hits: string[] = []
    for (let i = 0; i < BUILDING_SOLIDS.length; i++) {
      for (let j = i + 1; j < BUILDING_SOLIDS.length; j++) {
        if (overlap(box(BUILDING_SOLIDS[i]), box(BUILDING_SOLIDS[j]), 0.1))
          hits.push(`${BUILDING_SOLIDS[i].id} ↔ ${BUILDING_SOLIDS[j].id}`)
      }
    }
    expect(hits).toEqual([])
  })

  it('every building collider covers ≥95% of its visual footprint', () => {
    const BUILDING_PATH: Record<string, string> = {
      a: 'city/building-a',
      c: 'city/building-c',
      e: 'city/building-e',
      f: 'city/building-f',
      g: 'city/building-g',
      j: 'city/building-j',
    }
    const short: string[] = []
    buildingRows.forEach((row, index) => {
      const bounds = FOOTPRINTS[BUILDING_PATH[row.type]]
      const visualX = (bounds.max[0] - bounds.min[0]) * row.scale
      const visualZ = (bounds.max[2] - bounds.min[2]) * row.scale
      const visualArea = visualX * visualZ
      const solid = BUILDING_SOLIDS[index]
      const colliderArea = solid.hx * 2 * (solid.hz * 2)
      if (colliderArea < visualArea * 0.95)
        short.push(
          `${solid.id}: ${colliderArea.toFixed(1)}<${visualArea.toFixed(1)}`
        )
    })
    expect(short).toEqual([])
  })

  it('all spawn, NPC, stop and map-target points stay outside solids', () => {
    const points: [string, [number, number, number]][] = [
      ['SPAWN', SPAWN],
      ...Object.entries(PEOPLE).map(
        ([id, p]) => [`npc:${id}`, p.at] as [string, [number, number, number]]
      ),
      ...Object.entries(PLACES).flatMap(
        ([id, place]) =>
          [
            [`stop:${id}`, place.stop],
            [`at:${id}`, place.at],
          ] as [string, [number, number, number]][]
      ),
    ]
    const hits: string[] = []
    for (const [name, point] of points) {
      for (const obstacle of obstacles) {
        if (inside(point, obstacle, CAPSULE)) hits.push(name)
      }
    }
    expect([...new Set(hits)]).toEqual([])
  })

  it('every stop and NPC is reachable from spawn', () => {
    const grid = 0.5
    const minX = -52
    const maxX = 124
    const minZ = -116
    const maxZ = 44
    const cols = Math.ceil((maxX - minX) / grid)
    const rows = Math.ceil((maxZ - minZ) / grid)
    const inflated = SOLIDS.filter((s) => s.kind !== 'wall').map((s) =>
      box({ x: s.x, z: s.z, hx: s.hx + CAPSULE, hz: s.hz + CAPSULE })
    )
    const blocked = (gx: number, gz: number) => {
      const x = minX + gx * grid
      const z = minZ + gz * grid
      return inflated.some(
        (b) => x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ
      )
    }
    const key = (gx: number, gz: number) => gz * cols + gx
    const toCell = (p: [number, number, number]) => [
      Math.round((p[0] - minX) / grid),
      Math.round((p[2] - minZ) / grid),
    ]
    const [sx, sz] = toCell(SPAWN)
    const seen = new Set<number>([key(sx, sz)])
    const queue = [[sx, sz]]
    while (queue.length) {
      const [gx, gz] = queue.pop() as [number, number]
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = gx + dx
        const nz = gz + dz
        if (nx < 0 || nz < 0 || nx >= cols || nz >= rows) continue
        const k = key(nx, nz)
        if (seen.has(k) || blocked(nx, nz)) continue
        seen.add(k)
        queue.push([nx, nz])
      }
    }
    const targets: [string, [number, number, number]][] = [
      ...Object.entries(PLACES).map(
        ([id, p]) =>
          [`stop:${id}`, p.stop] as [string, [number, number, number]]
      ),
      ...Object.entries(PEOPLE).map(
        ([id, p]) => [`npc:${id}`, p.at] as [string, [number, number, number]]
      ),
    ]
    // NPCs and stops stand against scenery, so a target counts as reachable
    // when any connected free cell lies within an approach radius of it. This
    // still flags a genuinely sealed-off pocket (no nearby cell is reachable).
    const approach = 4 // cells (2 m)
    const reachableNear = (point: [number, number, number]) => {
      const [cx, cz] = toCell(point)
      for (let dx = -approach; dx <= approach; dx++) {
        for (let dz = -approach; dz <= approach; dz++) {
          const gx = cx + dx
          const gz = cz + dz
          if (gx < 0 || gz < 0 || gx >= cols || gz >= rows) continue
          if (seen.has(key(gx, gz))) return true
        }
      }
      return false
    }
    const unreachable: string[] = []
    for (const [name, point] of targets) {
      if (!reachableNear(point)) unreachable.push(name)
    }
    expect(unreachable).toEqual([])
  })
})

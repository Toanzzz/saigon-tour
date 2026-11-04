import { BOUNDS, GROUND } from '@/shared/world/district'
import { distance, type Point } from '@/shared/world/places'
import { SOLIDS } from '@/shared/world/solids'

const STEP = 0.5
const CLEARANCE = 0.45

function blocked(x: number, z: number) {
  return (
    !GROUND.some(
      (r) =>
        Math.abs(x - r.x) <= r.w / 2 - CLEARANCE &&
        Math.abs(z - r.z) <= r.d / 2 - CLEARANCE
    ) ||
    SOLIDS.some(
      (s) =>
        Math.abs(x - s.x) < s.hx + CLEARANCE &&
        Math.abs(z - s.z) < s.hz + CLEARANCE
    )
  )
}
const cache = new Map<string, boolean>()
function blockedCell(x: number, z: number) {
  const p = point(x, z)
  const id = key(x, z)
  if (!cache.has(id)) cache.set(id, blocked(p[0], p[2]))
  return cache.get(id) ?? true
}
function key(x: number, z: number) {
  return `${x},${z}`
}
function cell(p: Point) {
  return [
    Math.round((p[0] - BOUNDS.minX) / STEP),
    Math.round((p[2] - BOUNDS.minZ) / STEP),
  ] as const
}
function point(x: number, z: number): Point {
  return [BOUNDS.minX + x * STEP, 0.9, BOUNDS.minZ + z * STEP]
}

export function segmentClear(a: Point, b: Point) {
  const steps = Math.ceil(distance(a, b) / 0.15)
  for (let i = 0; i <= steps; i++) {
    const t = steps ? i / steps : 0
    if (blocked(a[0] + (b[0] - a[0]) * t, a[2] + (b[2] - a[2]) * t))
      return false
  }
  return true
}
function smooth(path: Point[]) {
  const result: Point[] = []
  let index = 0
  while (index < path.length) {
    result.push(path[index])
    let next = path.length - 1
    while (next > index + 1 && !segmentClear(path[index], path[next])) next--
    if (next === index) break
    index = next
  }
  return result
}
export function findRoute(from: Point, to: Point, radius = 0.3) {
  if (
    ![...from, ...to].every(Number.isFinite) ||
    to[0] < BOUNDS.minX ||
    to[0] > BOUNDS.maxX ||
    to[2] < BOUNDS.minZ ||
    to[2] > BOUNDS.maxZ
  )
    return null
  if (radius < 1 && blocked(to[0], to[2])) return null
  if (radius < 1 && segmentClear(from, to)) return [from, to]
  const [sx, sz] = cell(from),
    [tx, tz] = cell(to)
  const open = [{ x: sx, z: sz, f: 0 }]
  const came = new Map<string, string>()
  const cost = new Map<string, number>([[key(sx, sz), 0]])
  const seen = new Set<string>()
  while (open.length) {
    open.sort((a, b) => a.f - b.f)
    const current = open.shift()
    if (!current) break
    const ck = key(current.x, current.z)
    if (seen.has(ck)) continue
    seen.add(ck)
    if (distance(point(current.x, current.z), to) <= Math.max(radius, 0.4)) {
      const result: Point[] = [point(current.x, current.z)]
      let k = ck
      while (came.has(k)) {
        const previous = came.get(k)
        if (!previous) break
        k = previous
        const [x, z] = k.split(',').map(Number)
        result.push(point(x, z))
      }
      const path = result.reverse()
      if (radius < 1 && !blocked(to[0], to[2])) path.push(to)
      path[0] = from
      if (path.length > 1 && !segmentClear(path[0], path[1])) return null
      return smooth(path)
    }
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ]) {
      const x = current.x + dx,
        z = current.z + dz
      if (
        x < 0 ||
        z < 0 ||
        x > (BOUNDS.maxX - BOUNDS.minX) / STEP ||
        z > (BOUNDS.maxZ - BOUNDS.minZ) / STEP
      )
        continue
      if (blockedCell(x, z)) continue
      if (
        dx &&
        dz &&
        (blockedCell(current.x + dx, current.z) ||
          blockedCell(current.x, current.z + dz))
      )
        continue
      const nk = key(x, z),
        next = (cost.get(ck) ?? 0) + (dx && dz ? 1.4 : 1)
      if (next >= (cost.get(nk) ?? Infinity)) continue
      cost.set(nk, next)
      came.set(nk, ck)
      open.push({ x, z, f: next + Math.hypot(x - tx, z - tz) })
    }
  }
  return null
}

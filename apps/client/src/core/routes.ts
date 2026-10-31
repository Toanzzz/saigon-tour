import type { LocationId } from '@saigon/shared'
import type { TravelMode } from './places'
import { PLACES, type Point } from './places'

/**
 * Bus network: a tree of road nodes. Every edge runs along one axis so the
 * vehicle stays on the authored streets. Lê Lợi (z = 12) is the trunk.
 */
const NODES = {
  lloi: [8, 0, 12],
  parkSpur: [8, 0, 1],
  riverSpur: [8, 0, 29],
  dkhoi: [88, 0, 12],
  paris: [88, 0, -62],
  postSpur: [100, 0, -62],
} satisfies Record<string, Point>
type Node = keyof typeof NODES | LocationId
const EDGES: [Node, Node][] = [
  ['market', 'lloi'],
  ['lloi', 'parkSpur'],
  ['parkSpur', 'park'],
  ['lloi', 'riverSpur'],
  ['riverSpur', 'river'],
  ['riverSpur', 'alley'],
  ['lloi', 'cityhall'],
  ['cityhall', 'dkhoi'],
  ['dkhoi', 'opera'],
  ['opera', 'cathedral'],
  ['cathedral', 'paris'],
  ['paris', 'postSpur'],
  ['postSpur', 'postoffice'],
]
const METRO_STOPS = new Set<LocationId>([
  'market',
  'cityhall',
  'opera',
  'cathedral',
  'postoffice',
])
const METRO_EDGES: [LocationId, LocationId][] = [
  ['market', 'cityhall'],
  ['cityhall', 'opera'],
  ['opera', 'cathedral'],
  ['cathedral', 'postoffice'],
]
const at = (node: Node): Point =>
  node in NODES
    ? NODES[node as keyof typeof NODES]
    : PLACES[node as LocationId].stop

function path(from: Node, to: Node): Node[] {
  const previous = new Map<Node, Node | null>([[from, null]])
  const queue: Node[] = [from]
  while (queue.length) {
    const node = queue.shift() as Node
    if (node === to) break
    for (const [a, b] of EDGES) {
      const next = a === node ? b : b === node ? a : null
      if (next && !previous.has(next)) {
        previous.set(next, node)
        queue.push(next)
      }
    }
  }
  const result: Node[] = []
  for (let node: Node | null = to; node; node = previous.get(node) ?? null)
    result.unshift(node)
  return result
}

function metroPath(from: LocationId, to: LocationId): Point[] | null {
  if (!METRO_STOPS.has(from) || !METRO_STOPS.has(to)) return null
  const previous = new Map<LocationId, LocationId | null>([[from, null]])
  const queue: LocationId[] = [from]
  while (queue.length) {
    const node = queue.shift() as LocationId
    if (node === to) break
    for (const [a, b] of METRO_EDGES) {
      const next = a === node ? b : b === node ? a : null
      if (next && !previous.has(next)) {
        previous.set(next, node)
        queue.push(next)
      }
    }
  }
  if (!previous.has(to)) return null
  const stations: LocationId[] = []
  for (
    let node: LocationId | null = to;
    node;
    node = previous.get(node) ?? null
  )
    stations.unshift(node)
  const points: Point[] = []
  for (let index = 1; index < stations.length; index++) {
    const start = PLACES[stations[index - 1]].stop
    const end = PLACES[stations[index]].stop
    if (!points.length) points.push(start)
    if (start[0] !== end[0] && start[2] !== end[2])
      points.push([end[0], start[1], start[2]])
    points.push(end)
  }
  return points
}

export function route(
  from: LocationId,
  to: LocationId,
  mode: TravelMode = 'bus'
): Point[] {
  return (
    (mode === 'metro' ? metroPath(from, to) : null) ?? path(from, to).map(at)
  )
}

import type { LocationId } from '@saigon/shared'
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

export function route(from: LocationId, to: LocationId): Point[] {
  return path(from, to).map(at)
}

import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group } from 'three'
import { game } from '@/shared/state/game'
import type { Placement } from './assets'
import { Nearby } from './nearby'
import { Blocks } from './primitives'

/**
 * Oversized Tao Đàn-style dầu trees at the edges of the existing PARK rect,
 * clear of the Linh/gathering anchors, the fountain, and the coin at (34, −6).
 * Tall trunks carry solids (see GIANT_TREE_TRUNKS). Every trunk/canopy tier
 * batches into one instanced draw across all trees, and the canopy sways as a
 * single group unless reduced motion is on. The park name is unchanged.
 */

const TRUNK = '#8a6b47'
const CANOPY_DARK = '#4f7f52'
const CANOPY = '#6fa368'
const CANOPY_LIGHT = '#8fc07f'
const CANOPY_BASE_Y = 8.8

/** Trunk centres inside PARK (x 16..38, z −17..−1), each with a collider. */
export const GIANT_TREE_TRUNKS: { x: number; z: number }[] = [
  { x: 17, z: -16 },
  { x: 37, z: -16 },
  { x: 17, z: -3 },
  { x: 37, z: -3 },
]

/** One canopy tier's cutout boxes, fanned around each trunk. */
function tier(y: number, r: number, count: number): Placement[] {
  const out: Placement[] = []
  GIANT_TREE_TRUNKS.forEach((t, treeIndex) => {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + treeIndex
      out.push({
        position: [t.x + Math.cos(a) * r * 0.6, y, t.z + Math.sin(a) * r * 0.6],
        rotation: [0, a, 0],
        scale: [r, r * 0.7, 0.4],
      })
    }
  })
  return out
}

export function GiantParkTrees() {
  const crown = useRef<Group>(null)
  useFrame(() => {
    if (!crown.current) return
    crown.current.rotation.z = game.state.reducedMotion
      ? 0
      : Math.sin(Date.now() / 1700) * 0.015
  })
  const trunks: Placement[] = GIANT_TREE_TRUNKS.map((t) => ({
    position: [t.x, 4.4, t.z],
    scale: [0.9, 8.8, 0.9],
  }))
  // Park centre ≈ (27, −9); cull the swaying crowns when the camera is away.
  return (
    <Nearby at={[27, -9]} distance={42}>
      <Blocks color={TRUNK} placements={trunks} shadow />
      {/* The crown group pivots at the canopy base so the sway stays subtle. */}
      <group ref={crown} position={[0, CANOPY_BASE_Y, 0]}>
        <group position={[0, -CANOPY_BASE_Y, 0]}>
          <Blocks
            color={CANOPY_DARK}
            placements={tier(CANOPY_BASE_Y, 3.6, 6)}
          />
          <Blocks color={CANOPY} placements={tier(CANOPY_BASE_Y + 1.6, 3, 6)} />
          <Blocks
            color={CANOPY_LIGHT}
            placements={tier(CANOPY_BASE_Y + 3, 2, 5)}
          />
        </group>
      </group>
    </Nearby>
  )
}

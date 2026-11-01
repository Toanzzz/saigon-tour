import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { BOUNDS } from './district'
import { SOLIDS } from './solids'

/**
 * Every collider comes from the shared solids registry plus the ground slab.
 * City geometry no longer carries hand-written colliders, so visuals and
 * collision stay in sync by construction.
 */
export function Collision() {
  const { minX, maxX, minZ, maxZ } = BOUNDS
  return (
    <RigidBody type="fixed" colliders={false} friction={0}>
      <CuboidCollider
        args={[(maxX - minX) / 2, 0.3, (maxZ - minZ) / 2]}
        position={[(maxX + minX) / 2, -0.3, (maxZ + minZ) / 2]}
      />
      {SOLIDS.map((solid) => (
        <CuboidCollider
          key={solid.id}
          args={[solid.hx, solid.h / 2, solid.hz]}
          position={[solid.x, solid.h / 2, solid.z]}
        />
      ))}
    </RigidBody>
  )
}

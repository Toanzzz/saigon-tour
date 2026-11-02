import { useFrame } from '@react-three/fiber'
import { type ReactNode, useRef } from 'react'
import type { Group } from 'three'

/**
 * Culls its children when the camera is farther than `distance` from the
 * `[x, z]` centre. Used to keep local dressing (stools, bulbs, postcards,
 * trees) out of the draw call count at distant perf poses, the same pattern
 * street-life.tsx uses for the food alley.
 */
export function Nearby({
  at,
  distance,
  children,
}: {
  at: [number, number]
  distance: number
  children: ReactNode
}) {
  const ref = useRef<Group>(null)
  useFrame(({ camera }) => {
    if (ref.current)
      ref.current.visible =
        (camera.position.x - at[0]) ** 2 + (camera.position.z - at[1]) ** 2 <
        distance * distance
  })
  return <group ref={ref}>{children}</group>
}

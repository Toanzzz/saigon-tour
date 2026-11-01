import { useFrame } from '@react-three/fiber'
import { UNLOCKS } from '@saigon/shared'
import { useRef } from 'react'
import { type Group, Vector3 } from 'three'
import { Character } from '@/shared/world'

const OFFSET = 1.5

/**
 * A follower pet that eases toward a point behind its owner and plays a gait
 * clip by speed. Lazily rendered; only mounted when a pet is equipped.
 */
export function Pet({
  id,
  target,
  heading,
}: {
  id: string
  /** Owner world position; the pet trails behind the heading. */
  target: () => [number, number, number]
  /** Owner facing in radians. */
  heading: () => number
}) {
  const def = UNLOCKS[id]
  const group = useRef<Group>(null)
  const pos = useRef(new Vector3())
  const desired = useRef(new Vector3())
  const speed = useRef(0)
  const started = useRef(false)
  const animation = useRef<'idle' | 'walk' | 'run'>('idle')

  useFrame((_, delta) => {
    if (!group.current) return
    const [x, y, z] = target()
    const h = heading()
    desired.current.set(x - Math.sin(h) * OFFSET, y, z - Math.cos(h) * OFFSET)
    if (!started.current) {
      pos.current.copy(desired.current)
      started.current = true
    }
    const step = 1 - Math.exp(-6 * Math.min(delta, 0.1))
    const prev = pos.current.clone()
    pos.current.lerp(desired.current, step)
    const moved = pos.current.distanceTo(prev) / Math.max(delta, 0.001)
    speed.current += (moved - speed.current) * 0.2
    group.current.position.copy(pos.current)
    const face = Math.atan2(
      desired.current.x - prev.x,
      desired.current.z - prev.z
    )
    if (speed.current > 0.2) group.current.rotation.y = face
    const next =
      speed.current > 3 ? 'run' : speed.current > 0.4 ? 'walk' : 'idle'
    if (next !== animation.current) animation.current = next
  })

  return (
    <group ref={group}>
      <Character
        path={def?.model}
        animation={animation.current}
        scale={(def?.scale ?? 0.5) * 2.35}
      />
    </group>
  )
}

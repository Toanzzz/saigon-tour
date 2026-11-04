import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group } from 'three'
import { game } from '@/shared/state/game'
import { stamina } from './store'

export function ConsumeEffect() {
  const ref = useRef<Group>(null)
  useFrame(() => {
    const group = ref.current
    if (!group) return
    const elapsed = Date.now() - stamina.state.usedAt
    const showing = elapsed >= 0 && elapsed < 650 && !game.state.reducedMotion
    group.visible = showing
    if (showing) {
      group.position.y = 0.3 + elapsed / 900
      group.rotation.y = elapsed / 250
    }
  })
  return (
    <group ref={ref} visible={false}>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          position={[Math.cos(i * 2.1) * 0.4, i * 0.2, Math.sin(i * 2.1) * 0.4]}
        >
          <octahedronGeometry args={[0.06]} />
          <meshBasicMaterial color="#e6bc52" />
        </mesh>
      ))}
    </group>
  )
}

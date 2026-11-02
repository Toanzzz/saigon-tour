import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import type { DirectionalLight } from 'three'
import { motion } from '@/shared/runtime/motion'
import { LOOK } from '@/shared/world/look-flag'

const OFFSET = [-22, 38, 23] as const

/** Sun with a shadow frustum that follows the player across the district. */
export function Sun({ evening = false }: { evening?: boolean }) {
  const light = useRef<DirectionalLight>(null)
  const { scene, size } = useThree()
  const mobile = size.width < 700
  useEffect(() => {
    if (light.current) scene.add(light.current.target)
  }, [scene])
  useFrame(() => {
    const sun = light.current
    if (!sun) return
    const { x, z } = motion.position
    const snap = (value: number) => Math.round(value / 4) * 4
    sun.position.set(snap(x) + OFFSET[0], OFFSET[1], snap(z) + OFFSET[2])
    sun.target.position.set(snap(x), 0, snap(z))
  })
  return (
    <directionalLight
      ref={light}
      position={[...OFFSET]}
      intensity={LOOK === 'comic' ? (evening ? 1.6 : 2.9) : evening ? 1.7 : 3.2}
      color={evening ? '#aab9ff' : '#ffdfaa'}
      castShadow
      shadow-mapSize={mobile ? [1024, 1024] : [2048, 2048]}
      shadow-camera-left={-40}
      shadow-camera-right={40}
      shadow-camera-top={34}
      shadow-camera-bottom={-34}
      shadow-camera-far={110}
      shadow-normalBias={0.06}
    />
  )
}

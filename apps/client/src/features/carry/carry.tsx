import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group } from 'three'
import { game } from '@/shared/state/game'
import { readWobbleAngle } from './controller'

/**
 * A procedural 3-tier wedding cake on a tray, built from THREE primitives — no
 * new asset. It is held at the avatar's hands and tilts with the live wobble.
 * With reduced motion it stays level (no tilt).
 */
function CakeMesh() {
  return (
    <group>
      {/* Tray */}
      <mesh position={[0, 0, 0]} castShadow>
        <cylinderGeometry args={[0.26, 0.26, 0.03, 20]} />
        <meshStandardMaterial color="#c9a14a" roughness={0.5} metalness={0.3} />
      </mesh>
      {/* Bottom tier */}
      <mesh position={[0, 0.095, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.2, 0.16, 20]} />
        <meshStandardMaterial color="#fff4e6" roughness={0.85} />
      </mesh>
      {/* Middle tier */}
      <mesh position={[0, 0.24, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.14, 0.13, 20]} />
        <meshStandardMaterial color="#ffe9f0" roughness={0.85} />
      </mesh>
      {/* Top tier */}
      <mesh position={[0, 0.355, 0]} castShadow>
        <cylinderGeometry args={[0.085, 0.085, 0.1, 20]} />
        <meshStandardMaterial color="#fff4e6" roughness={0.85} />
      </mesh>
      {/* Topper */}
      <mesh position={[0, 0.44, 0]} castShadow>
        <boxGeometry args={[0.05, 0.05, 0.05]} />
        <meshStandardMaterial color="#d44f7a" roughness={0.6} />
      </mesh>
    </group>
  )
}

/**
 * Wraps a carried prop and tilts it with the wobble each frame. Reduced motion
 * pins the tilt to zero so nothing sways.
 */
export function CarriedParcel({
  position = [0, 0.95, 0.35],
  children,
}: {
  position?: [number, number, number]
  children: React.ReactNode
}) {
  const group = useRef<Group>(null)
  useFrame(() => {
    if (!group.current) return
    const angle = game.state.reducedMotion ? 0 : readWobbleAngle()
    group.current.rotation.z = angle
    group.current.rotation.x = angle * 0.4
  })
  return (
    <group ref={group} position={position}>
      {children}
    </group>
  )
}

/** The fragile wedding cake prop, carried at the avatar's hands. */
export function CarriedCake({
  position,
}: {
  position?: [number, number, number]
}) {
  return (
    <CarriedParcel position={position}>
      <CakeMesh />
    </CarriedParcel>
  )
}

import { useFrame } from '@react-three/fiber'
import type { AvatarBody, Look } from '@saigon/shared'
import { useRef } from 'react'
import type { Group } from 'three'
import { Avatar } from './character'

/** Soft three-point lighting for a presented avatar, used by stages and cards. */
export function AvatarLights() {
  return (
    <>
      <hemisphereLight args={['#fff3d5', '#7e8976', 2]} />
      <directionalLight position={[3, 5, 4]} intensity={1.6} />
      <directionalLight position={[-3, 2, -2]} intensity={0.5} />
    </>
  )
}

/** A slowly turning avatar, optionally draggable, for previews and the wardrobe. */
export function AvatarTurntable({
  body,
  look,
  animation = 'idle',
  spin = 0.4,
  yaw,
}: {
  body: AvatarBody
  look?: Look | null
  animation?: string
  /** Radians per second of idle auto-rotation. */
  spin?: number
  /** Controlled yaw (radians); disables the auto-rotation when provided. */
  yaw?: () => number
}) {
  const group = useRef<Group>(null)
  useFrame((_, delta) => {
    if (!group.current) return
    if (yaw) group.current.rotation.y = yaw()
    else group.current.rotation.y += spin * delta
  })
  return (
    <group ref={group} position={[0, -1.6, 0]}>
      <Avatar body={body} look={look} animation={animation} shadow={false} />
    </group>
  )
}

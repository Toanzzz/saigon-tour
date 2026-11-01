import { useFrame } from '@react-three/fiber'
import type { AvatarBody, Look, UnlockId, UnlockSlot } from '@saigon/shared'
import { UNLOCKS } from '@saigon/shared'
import { useRef } from 'react'
import type { Group } from 'three'
import { AvatarTurntable, Model, PersonalVehicle } from '@/shared/world'

/** Slowly turning wrapper for a non-avatar thumbnail. */
function Spin({
  children,
  position = [0, 0, 0],
  scale = 1,
}: {
  children: React.ReactNode
  position?: [number, number, number]
  scale?: number
}) {
  const group = useRef<Group>(null)
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += 0.5 * delta
  })
  return (
    <group ref={group} position={position} scale={scale}>
      {children}
    </group>
  )
}

/** The 3D content shown inside one owned card's thumbnail, per slot. */
export function ItemModel({
  id,
  slot,
  body,
}: {
  id: UnlockId
  slot: UnlockSlot
  body: AvatarBody
}) {
  const def = UNLOCKS[id]
  if (slot === 'outfit') {
    const look: Look = { outfit: id }
    return (
      <group position={[0, 0.7, 0]} scale={0.7}>
        <AvatarTurntable body={body} look={look} />
      </group>
    )
  }
  if (slot === 'vehicle')
    return (
      <Spin position={[0, -0.4, 0]} scale={0.7}>
        <PersonalVehicle id={id} />
      </Spin>
    )
  if (slot === 'pet' && def?.model)
    return (
      <Spin position={[0, -0.4, 0]} scale={1.4}>
        <Model path={def.model} shadow={false} />
      </Spin>
    )
  if (def?.model)
    // Hats and accessories are modeled in bone-local space; recentre for the card.
    return (
      <Spin position={[0, -1.1, 0]} scale={2.6}>
        <Model path={def.model} shadow={false} />
      </Spin>
    )
  return null
}

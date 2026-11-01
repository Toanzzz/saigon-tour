import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import type { Group } from 'three'
import { isTestPausedForScreenshot } from '@/app/test-hooks'
import { motion } from '@/shared/runtime/motion'
import { game } from '@/shared/state/game'
import { Character } from '@/shared/world'
import { npcPoses } from '@/shared/world/npc-pose'
import { RESIDENT_VISUALS as RESIDENTS } from '@/shared/world/residents'
import { NpcLabel } from './npc-label'

const activity = new Map<string, boolean>()
export function crowdStats() {
  return {
    ambientCount: RESIDENTS.length,
    activeCrowd: [...activity.values()].filter(Boolean).length,
    animationRadius: 32,
  }
}

export function Crowd() {
  return RESIDENTS.map((resident, index) => (
    <AmbientResident
      key={resident.id}
      resident={resident}
      phase={index * 0.72}
    />
  ))
}

function AmbientResident({
  resident,
  phase,
}: {
  resident: (typeof RESIDENTS)[number]
  phase: number
}) {
  const ref = useRef<Group>(null)
  const active = useRef(false)
  const elapsed = useRef(resident.phase ?? phase)
  useEffect(
    () => () => {
      activity.delete(resident.id)
      npcPoses.delete(resident.id)
    },
    [resident.id]
  )
  useFrame((_, delta) => {
    const object = ref.current
    if (!object) return
    const [x, z] = resident.at
    const distance = Math.hypot(motion.position.x - x, motion.position.z - z)
    object.visible = distance < 62
    active.current =
      distance < 32 &&
      game.state.screen === 'playing' &&
      !isTestPausedForScreenshot()
    activity.set(resident.id, active.current)
    npcPoses.set(resident.id, [
      object.position.x,
      object.position.y,
      object.position.z,
    ])
    if (
      game.state.dialogue?.npc === resident.id ||
      Math.hypot(
        motion.position.x - object.position.x,
        motion.position.z - object.position.z
      ) < 3.5
    ) {
      object.rotation.y = Math.atan2(
        motion.position.x - object.position.x,
        motion.position.z - object.position.z
      )
      active.current = false
      return
    }
    if (!active.current || !resident.walk) return
    elapsed.current += Math.min(delta, 0.05) * 0.3
    const t = Math.sin(elapsed.current)
    const direction = Math.cos(elapsed.current) > 0 ? 1 : -1
    object.position.set(
      x + t * resident.walk[0],
      0.12,
      z + t * resident.walk[1]
    )
    object.rotation.y = Math.atan2(
      resident.walk[0] * direction,
      resident.walk[1] * direction
    )
  })
  return (
    <group
      ref={ref}
      name={`ambient-${resident.id}`}
      position={[resident.at[0], 0.12, resident.at[1]]}
      rotation={[0, resident.yaw ?? 0, 0]}
    >
      <NpcLabel id={resident.id} />
      <Character
        model={resident.model}
        animation={resident.animation}
        scale={2.25}
        active={() => active.current}
        shadow={false}
      />
    </group>
  )
}

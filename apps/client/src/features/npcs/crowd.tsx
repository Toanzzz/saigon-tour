import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import type { Group } from 'three'
import { isTestPausedForScreenshot } from '@/app/test-hooks'
import { motion } from '@/shared/runtime/motion'
import { game } from '@/shared/state/game'
import { Character } from '@/shared/world'

type Resident = {
  id: string
  at: [number, number]
  model: 'male-a' | 'male-b' | 'female-a' | 'female-b'
  animation: string
  yaw?: number
  walk?: [number, number]
  phase?: number
}

const RESIDENTS: Resident[] = [
  {
    id: 'bread-vendor',
    at: [-34, 2],
    model: 'male-b',
    animation: 'interact-right',
  },
  {
    id: 'fruit-vendor',
    at: [-11, 2],
    model: 'female-a',
    animation: 'holding-both',
  },
  {
    id: 'market-browse',
    at: [-30, 5.5],
    model: 'female-b',
    animation: 'idle',
    yaw: Math.PI,
  },
  {
    id: 'market-walk',
    at: [-17, 5.5],
    model: 'male-a',
    animation: 'walk',
    walk: [5, 0],
  },
  {
    id: 'market-family',
    at: [-40, 3],
    model: 'female-a',
    animation: 'emote-yes',
  },
  { id: 'coffee-friend', at: [-32, 18.5], model: 'male-b', animation: 'idle' },
  { id: 'coffee-reader', at: [-22, 18.8], model: 'female-b', animation: 'sit' },
  {
    id: 'commuter',
    at: [1, 17.5],
    model: 'male-a',
    animation: 'walk',
    walk: [5, 0],
    phase: 2,
  },
  {
    id: 'student',
    at: [20, -1],
    model: 'female-a',
    animation: 'walk',
    walk: [6, 0],
  },
  {
    id: 'park-reader',
    at: [20, -12],
    model: 'male-b',
    animation: 'sit',
    yaw: Math.PI / 2,
  },
  {
    id: 'park-stretch',
    at: [34, -5.8],
    model: 'female-b',
    animation: 'emote-yes',
  },
  {
    id: 'plaza-friends',
    at: [67, 3],
    model: 'female-a',
    animation: 'emote-yes',
  },
  {
    id: 'plaza-stroll',
    at: [71, 23],
    model: 'male-a',
    animation: 'walk',
    walk: [0, 5],
  },
  {
    id: 'opera-visitor',
    at: [92, -30],
    model: 'female-b',
    animation: 'idle',
    yaw: Math.PI / 2,
  },
  {
    id: 'postcard-reader',
    at: [98, -80],
    model: 'male-b',
    animation: 'holding-both',
    yaw: Math.PI / 2,
  },
  {
    id: 'square-tourist',
    at: [84, -68],
    model: 'female-a',
    animation: 'walk',
    walk: [5, 0],
  },
  {
    id: 'riverside-friends',
    at: [42, 35],
    model: 'female-b',
    animation: 'idle',
    yaw: Math.PI,
  },
  {
    id: 'river-jogger',
    at: [61, 34.8],
    model: 'male-a',
    animation: 'walk',
    walk: [6, 0],
    phase: 1,
  },
  {
    id: 'alley-vendor',
    at: [-29, 33],
    model: 'male-b',
    animation: 'interact-right',
    yaw: Math.PI,
  },
  { id: 'alley-diner', at: [-23, 31], model: 'female-a', animation: 'sit' },
]

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
  resident: Resident
  phase: number
}) {
  const ref = useRef<Group>(null)
  const active = useRef(false)
  const elapsed = useRef(resident.phase ?? phase)
  useEffect(() => () => void activity.delete(resident.id), [resident.id])
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

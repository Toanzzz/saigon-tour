import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { NPCS, type NpcId } from '@saigon/shared'
import { useSelector } from '@tanstack/react-store'
import { useRef } from 'react'
import type { Group } from 'three'
import { isTestPausedForScreenshot } from '@/app/test-hooks'
import { motion } from '@/shared/runtime/motion'
import { game } from '@/shared/state/game'
import { questTarget } from '@/shared/state/quests'
import { Character } from '@/shared/world'
import { PEOPLE } from '@/shared/world/places'
import { Crowd } from './crowd'

export function Neighbors() {
  const state = useSelector(game, (s) => s)
  const active = questTarget(state)
  return (
    <>
      {(Object.keys(PEOPLE) as NpcId[]).map((id) => (
        <Neighbor
          key={id}
          id={id}
          highlighted={
            id === active || state.quests.some((q) => q.giverNpcId === id)
          }
          ready={state.quests.some(
            (q) => q.giverNpcId === id && q.status === 'ready'
          )}
        />
      ))}
      <Crowd />
    </>
  )
}

const WANDERERS: Partial<
  Record<
    NpcId,
    { radiusX: number; radiusZ: number; phase: number; speed: number }
  >
> = {
  vy: { radiusX: 2.8, radiusZ: 1.2, phase: 0.3, speed: 0.24 },
  son: { radiusX: 2.1, radiusZ: 1.4, phase: 1.8, speed: 0.2 },
  thao: { radiusX: 1.8, radiusZ: 2.2, phase: 2.7, speed: 0.22 },
}

function Neighbor({
  id,
  highlighted,
  ready,
}: {
  id: NpcId
  highlighted: boolean
  ready: boolean
}) {
  const ref = useRef<Group>(null)
  const elapsed = useRef(WANDERERS[id]?.phase ?? 0)
  const wander = WANDERERS[id]
  const anchor = PEOPLE[id].at
  useFrame((_, delta) => {
    if (!wander || !ref.current || isTestPausedForScreenshot()) return
    elapsed.current += Math.min(delta, 0.05) * wander.speed
    ref.current.position.set(
      anchor[0] + Math.sin(elapsed.current) * wander.radiusX,
      anchor[1],
      anchor[2] + Math.cos(elapsed.current * 0.82) * wander.radiusZ
    )
    ref.current.rotation.y = Math.atan2(
      Math.cos(elapsed.current) * wander.radiusX,
      -Math.sin(elapsed.current * 0.82) * wander.radiusZ
    )
  })
  return (
    <group ref={ref} position={anchor}>
      <Character
        model={PEOPLE[id].model as 'female-a'}
        animation="idle"
        active={() =>
          game.state.screen === 'playing' &&
          !isTestPausedForScreenshot() &&
          Math.hypot(
            motion.position.x - (ref.current?.position.x ?? anchor[0]),
            motion.position.z - (ref.current?.position.z ?? anchor[2])
          ) < 36
        }
      />
      <mesh position={[0, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.75, highlighted ? 0.93 : 0.8, 40]} />
        <meshBasicMaterial color={PEOPLE[id].color} transparent opacity={0.9} />
      </mesh>
      <Html
        center
        position={[0, 2.55, 0]}
        distanceFactor={19}
        style={{ pointerEvents: 'none' }}
      >
        {highlighted && (
          <div className="world-label active">
            <span className="quest-marker" aria-hidden="true">
              <b>{ready ? '?' : '!'}</b>
            </span>
            <span className="name-tag">{NPCS[id].name}</span>
          </div>
        )}
      </Html>
    </group>
  )
}

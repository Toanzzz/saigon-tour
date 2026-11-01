import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { NPCS, type NpcId } from '@saigon/shared'
import { useSelector } from '@tanstack/react-store'
import { useRef } from 'react'
import type { Group } from 'three'
import { isTestPausedForScreenshot } from '@/app/test-hooks'
import { npcPosition } from '@/shared/api/city'
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
  const anchor = npcPosition(id)
  useFrame((_, delta) => {
    if (!ref.current || isTestPausedForScreenshot()) return
    const target = npcPosition(id)
    const alpha = 1 - Math.exp(-Math.min(delta, 0.05) * 6)
    const dx = target[0] - ref.current.position.x
    const dz = target[2] - ref.current.position.z
    ref.current.position.x += dx * alpha
    ref.current.position.z += dz * alpha
    if (Math.hypot(dx, dz) > 0.1) ref.current.rotation.y = Math.atan2(dx, dz)
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

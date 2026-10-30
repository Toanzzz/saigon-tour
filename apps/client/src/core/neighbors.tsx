import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { NPCS, type NpcId } from '@saigon/shared'
import { useStore } from '@tanstack/react-store'
import { useRef } from 'react'
import type { Group } from 'three'
import { game } from '../state/game'
import { Character } from '../world'
import { PEOPLE } from './places'

export function Neighbors() {
  const quest = useStore(game, (s) => s.quest)
  const active =
    quest?.objective.type === 'DELIVER' ? quest.objective.npcId : 'hoa'
  return (
    <>
      {(Object.keys(PEOPLE) as NpcId[]).map((id) => (
        <group key={id} position={PEOPLE[id].at}>
          <Character
            model={PEOPLE[id].model as 'female-a'}
            animation={id === 'tam' ? 'idle' : 'idle'}
          />
          <mesh position={[0, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.75, id === active ? 0.93 : 0.8, 40]} />
            <meshBasicMaterial
              color={PEOPLE[id].color}
              transparent
              opacity={0.9}
            />
          </mesh>
          <Html
            center
            position={[0, 2.55, 0]}
            distanceFactor={19}
            style={{ pointerEvents: 'none' }}
          >
            <div className={`world-label ${id === active ? 'active' : ''}`}>
              {id === active && <span className="quest-dot">!</span>}
              {NPCS[id].name}
            </div>
          </Html>
        </group>
      ))}
      <Pedestrian origin={[-4, 0, 18]} phase={0} model="female-a" />
      <Pedestrian origin={[35, 0, 16.7]} phase={3} model="male-a" />
      <Pedestrian origin={[16, 0, -17]} phase={1.5} model="female-b" />
    </>
  )
}
function Pedestrian({
  origin,
  phase,
  model,
}: {
  origin: [number, number, number]
  phase: number
  model: 'male-a' | 'female-a' | 'female-b'
}) {
  const ref = useRef<Group>(null)
  const time = useRef(phase)
  useFrame((_, delta) => {
    if (!ref.current || game.state.screen === 'paused') return
    time.current += Math.min(delta, 0.05) * 0.45
    ref.current.position.set(
      origin[0] + Math.sin(time.current) * 3.4,
      0.12,
      origin[2]
    )
    ref.current.rotation.y =
      Math.cos(time.current) > 0 ? Math.PI / 2 : -Math.PI / 2
  })
  return (
    <group ref={ref}>
      <Character model={model} animation="walk" scale={2.25} />
    </group>
  )
}

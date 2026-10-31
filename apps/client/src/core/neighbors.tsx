import { Html } from '@react-three/drei'
import { NPCS, type NpcId } from '@saigon/shared'
import { useStore } from '@tanstack/react-store'
import { game } from '../state/game'
import { Character } from '../world'
import { Crowd } from './crowd'
import { motion } from './motion'
import { PEOPLE } from './places'
import { isTestPausedForScreenshot } from './test-hooks'

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
            active={() =>
              game.state.screen === 'playing' &&
              !isTestPausedForScreenshot() &&
              Math.hypot(
                motion.position.x - PEOPLE[id].at[0],
                motion.position.z - PEOPLE[id].at[2]
              ) < 36
            }
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
            {id === active && (
              <div className="world-label active">
                <span className="quest-marker" aria-hidden="true">
                  <b>!</b>
                </span>
                <span className="name-tag">{NPCS[id].name}</span>
              </div>
            )}
          </Html>
        </group>
      ))}
      <Crowd />
    </>
  )
}

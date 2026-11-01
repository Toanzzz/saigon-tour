import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import type { NpcId } from '@saigon/shared'
import { useState } from 'react'
import { npcPosition } from '@/shared/api/city'
import { npcLabel } from '@/shared/i18n'
import { motion } from '@/shared/runtime/motion'
import { pulses } from '@/shared/state/friendship'
import { game } from '@/shared/state/game'

export function NpcLabel({ id }: { id: NpcId }) {
  const [view, setView] = useState({
    visible: false,
    marker: '',
    pulse: '',
    at: 0,
  })
  useFrame(() => {
    const state = game.state
    const quests = state.quests.filter((quest) => quest.giverNpcId === id)
    const ready = quests.some((quest) => quest.status === 'ready')
    const target = state.quests.some((quest) =>
      quest.steps.some(
        (step, i) =>
          !quest.progress[i] &&
          step.type !== 'GO_TO' &&
          step.type !== 'BUY' &&
          step.npcId === id
      )
    )
    const position = npcPosition(id)
    const visible = Boolean(
      quests.length ||
        target ||
        Math.hypot(
          motion.position.x - position[0],
          motion.position.z - position[2]
        ) < 10
    )
    const event = pulses.state[id]
    const pulse =
      event && Date.now() - event.at < 2200
        ? `${event.delta > 0 ? '+' : ''}${event.delta} ${event.delta > 0 ? '♥' : ''}`
        : ''
    const marker = ready ? '?' : quests.length || target ? '!' : ''
    const at = event?.at ?? 0
    if (
      view.visible !== visible ||
      view.marker !== marker ||
      view.pulse !== pulse ||
      view.at !== at
    )
      setView({ visible, marker, pulse, at })
  })
  if (!view.visible) return null
  return (
    <Html
      center
      position={[0, 2.55, 0]}
      distanceFactor={19}
      style={{ pointerEvents: 'none' }}
    >
      <div className="world-label">
        <span className="quest-marker">{view.marker}</span>
        <span className="name-tag">{npcLabel(id)}</span>
        {view.pulse && (
          <span
            key={view.at}
            className={`friendship-pulse ${game.state.reducedMotion ? 'still' : view.pulse.startsWith('+') ? 'warmer' : 'cooler'}`}
          >
            {view.pulse}
          </span>
        )}
      </div>
    </Html>
  )
}

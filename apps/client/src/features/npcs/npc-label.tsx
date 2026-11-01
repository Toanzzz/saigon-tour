import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { NEIGHBOR_IDS, type NpcId } from '@saigon/shared'
import { useSelector } from '@tanstack/react-store'
import { shallow } from '@tanstack/store'
import { npcPosition } from '@/shared/api/city'
import { npcLabel } from '@/shared/i18n'
import { motion } from '@/shared/runtime/motion'
import { pulses } from '@/shared/state/friendship'
import { game } from '@/shared/state/game'
import {
  type NpcLabelView,
  npcLabelOf,
  npcLabels,
  writeNpcLabels,
} from '@/shared/state/view'

function labelFor(id: NpcId): NpcLabelView {
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
  return { visible, marker, pulse, at: event?.at ?? 0 }
}

/** Single frame ticker: computes every neighbor label once and writes the map
 * on change, so each `NpcLabel` only has to select its entry. */
export function NpcLabelsTicker() {
  useFrame(() => {
    const next: Record<string, NpcLabelView> = {}
    for (const id of NEIGHBOR_IDS) next[id] = labelFor(id)
    writeNpcLabels(next)
  })
  return null
}

export function NpcLabel({ id }: { id: NpcId }) {
  const view = useSelector(npcLabels, (map) => map[id] ?? npcLabelOf(id), {
    compare: shallow,
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
        {view.marker && (
          <span className="quest-marker">
            <b>{view.marker}</b>
          </span>
        )}
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

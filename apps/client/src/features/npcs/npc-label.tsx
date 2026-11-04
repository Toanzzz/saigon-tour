import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { isRevealed, merchantFor, NPC_SHOPS, type NpcId } from '@saigon/shared'
import { useSelector } from '@tanstack/react-store'
import { shallow } from '@tanstack/store'
import { city, npcPosition } from '@/shared/api/city'
import { m, npcLabel } from '@/shared/i18n'
import { motion } from '@/shared/runtime/motion'
import { pulses } from '@/shared/state/friendship'
import { type GameState, game } from '@/shared/state/game'
import { clock } from '@/shared/state/ui'
import {
  type NpcLabelView,
  npcLabelOf,
  npcLabels,
  writeNpcLabels,
} from '@/shared/state/view'
import { Icon } from '@/shared/ui/icons'

/**
 * Does any quest point at this NPC as a next step? A hidden riddle on step 0
 * never lights up the answer NPC, so the marker cannot leak the answer.
 */
export function npcIsQuestTarget(
  state: GameState,
  id: NpcId,
  now: number
): boolean {
  return state.quests.some((quest) => {
    const hidden = Boolean(quest.riddle) && !isRevealed(quest, now)
    return quest.steps.some(
      (step, i) =>
        !quest.progress[i] &&
        !(hidden && i === 0) &&
        step.type !== 'GO_TO' &&
        (step.type === 'BUY'
          ? merchantFor(step.marketItemId) === id
          : step.npcId === id)
    )
  })
}

/** The world-label marker for an NPC: '?' ready, '!' has/targets a quest. */
export function npcMarker(state: GameState, id: NpcId, now: number): string {
  const quests = state.quests.filter((quest) => quest.giverNpcId === id)
  const ready = quests.some((quest) => quest.status === 'ready')
  const target = npcIsQuestTarget(state, id, now)
  return ready ? '?' : quests.length || target ? '!' : ''
}

function labelFor(id: NpcId): NpcLabelView {
  const state = game.state
  const now = clock.state.now
  const quests = state.quests.filter((quest) => quest.giverNpcId === id)
  const target = npcIsQuestTarget(state, id, now)
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
  return {
    visible,
    marker: npcMarker(state, id, now),
    pulse,
    at: event?.at ?? 0,
  }
}

/** Single frame ticker: computes every neighbor label once and writes the map
 * on change, so each `NpcLabel` only has to select its entry. */
export function NpcLabelsTicker() {
  useFrame(() => {
    const next: Record<string, NpcLabelView> = {}
    for (const id of Object.keys(NPC_SHOPS) as NpcId[]) next[id] = labelFor(id)
    writeNpcLabels(next)
  })
  return null
}

export function NpcLabel({ id }: { id: NpcId }) {
  const view = useSelector(npcLabels, (map) => map[id] ?? npcLabelOf(id), {
    compare: shallow,
  })
  const sale = useSelector(city, (value) => value.rareOffer)
  const rare = sale?.npcId === id && sale.endsAt > Date.now()
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
        {(NPC_SHOPS[id].length > 0 || rare) && (
          <span className={`merchant-mark${rare ? ' is-rare' : ''}`}>
            <Icon name="shop" size={14} />
            {rare ? (
              m.shop_rare()
            ) : (
              <span className="sr-only">{m.shop_title()}</span>
            )}
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

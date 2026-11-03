import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { NEIGHBOR_IDS, RESIDENT_IDS } from '@saigon/shared'
import { useRef, useState } from 'react'
import { npcPosition } from '@/shared/api/city'
import { npcSpeech } from '@/shared/api/presence'
import { getLocale, m } from '@/shared/i18n'
import { motion } from '@/shared/runtime/motion'
import { game } from '@/shared/state/game'
import { useXRPresenting } from '@/shared/xr/store'
import {
  CRY_ANCHORS,
  type CryBubble,
  type CryState,
  newCryState,
  stepCries,
  type Vec2,
} from './cry-scheduler'

const NPC_IDS = [...NEIGHBOR_IDS, ...RESIDENT_IDS]

/** Collect the ground positions of NPC speech bubbles that are live now. */
function activeNpcBubbles(now: number): Vec2[] {
  const out: Vec2[] = []
  for (const id of NPC_IDS) {
    const speech = npcSpeech.get(id)
    if (speech && speech.until > now) {
      const [x, , z] = npcPosition(id)
      out.push([x, z])
    }
  }
  return out
}

/**
 * The Vietnamese cry (shown in both locales) and its English gloss (shown only
 * under English), keyed explicitly so the typed paraglide functions stay
 * tree-shakeable and never resolved by string index.
 */
const CRY_TEXT: Record<string, () => string> = {
  cry_coffee: m.cry_coffee,
  cry_banhmi: m.cry_banhmi,
  cry_che: m.cry_che,
  cry_coconut: m.cry_coconut,
  cry_sugarcane: m.cry_sugarcane,
  cry_corn: m.cry_corn,
}
const CRY_GLOSS: Record<string, () => string> = {
  cry_coffee: m.cry_coffee_gloss,
  cry_banhmi: m.cry_banhmi_gloss,
  cry_che: m.cry_che_gloss,
  cry_coconut: m.cry_coconut_gloss,
  cry_sugarcane: m.cry_sugarcane_gloss,
  cry_corn: m.cry_corn_gloss,
}

export function Cries() {
  const xr = useXRPresenting()
  const states = useRef<Record<string, CryState>>(
    Object.fromEntries(CRY_ANCHORS.map((a) => [a.id, newCryState()]))
  )
  const lastTick = useRef(0)
  const [bubbles, setBubbles] = useState<CryBubble[]>([])
  useFrame(() => {
    // The cries are DOM, so throttle the scheduler well below the frame rate.
    const now = performance.now()
    if (now - lastTick.current < 180) return
    lastTick.current = now
    const player: Vec2 = [motion.position.x, motion.position.z]
    const anchors = CRY_ANCHORS.map((anchor) => {
      if (!anchor.npc) return anchor
      const [x, , z] = npcPosition(anchor.npc)
      return { ...anchor, at: [x, z] as Vec2 }
    })
    const result = stepCries(
      anchors,
      states.current,
      player,
      activeNpcBubbles(now),
      now,
      () => Math.random()
    )
    states.current = result.states
    // Only re-render when the visible set actually changes.
    setBubbles((prev) =>
      prev.length === result.bubbles.length &&
      prev.every(
        (b, i) =>
          b.id === result.bubbles[i].id &&
          b.cry === result.bubbles[i].cry &&
          b.at[0] === result.bubbles[i].at[0] &&
          b.at[1] === result.bubbles[i].at[1]
      )
        ? prev
        : result.bubbles
    )
  })
  if (xr) return null
  const reduced = game.state.reducedMotion
  const english = getLocale() === 'en'
  return (
    <group name="street-cries">
      {bubbles.map((bubble) => (
        <Html
          key={bubble.id}
          center
          position={[bubble.at[0], 2.2, bubble.at[1]]}
          distanceFactor={19}
          zIndexRange={[4, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div
            className={`presence-bubble street-cry${reduced ? ' still' : ''}`}
            role="status"
          >
            {CRY_TEXT[bubble.cry]()}
            {english && (
              <small className="cry-gloss">{CRY_GLOSS[bubble.cry]()}</small>
            )}
          </div>
        </Html>
      ))}
    </group>
  )
}

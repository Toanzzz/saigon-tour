import { View } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import {
  UNLOCK_SLOTS,
  UNLOCKS,
  type UnlockId,
  type UnlockSlot,
} from '@saigon/shared'
import { useSelector } from '@tanstack/react-store'
import { useEffect, useRef, useState } from 'react'
import { close } from '@/app/actions'
import { m, slotLabel } from '@/shared/i18n'
import { game } from '@/shared/state/game'
import { Dialog } from '@/shared/ui/dialog'
import { LockedCard, OwnedCard } from './item-card'
import { WardrobeStage } from './stage'

/** Owned and still-locked ids for a slot, in catalog order. */
function slotEntries(slot: UnlockSlot, owned: readonly string[]) {
  const ids = Object.values(UNLOCKS)
    .filter((entry) => entry.slot === slot)
    .map((entry) => entry.id as UnlockId)
  const ownedSet = new Set(owned)
  return {
    owned: ids.filter((id) => ownedSet.has(id)),
    locked: ids.filter((id) => !ownedSet.has(id)),
  }
}

export function WardrobePanel() {
  const unlocks = useSelector(game, (s) => s.unlocks)
  const body = useSelector(game, (s) => s.body)
  const [slot, setSlot] = useState<UnlockSlot>('hat')
  // Only mount the shared Canvas on the client so SSR tests still render cards.
  const [mounted, setMounted] = useState(false)
  const eventSource = useRef<HTMLDivElement>(null)
  useEffect(() => setMounted(true), [])
  const { owned, locked } = slotEntries(slot, unlocks.owned)

  return (
    <Dialog
      title={m.wardrobe_title()}
      onClose={close}
      className="wardrobe-dialog"
    >
      <div className="wardrobe-body-layout" ref={eventSource}>
        {mounted && (
          <Canvas
            className="wardrobe-canvas"
            dpr={[1, 1.5]}
            eventSource={eventSource as React.RefObject<HTMLElement>}
            gl={{ alpha: true }}
          >
            <View.Port />
          </Canvas>
        )}
        <WardrobeStage body={body} look={unlocks.equipped} />
        <div className="wardrobe-main">
          <div className="wardrobe-tabs" role="tablist">
            {UNLOCK_SLOTS.map((option) => (
              <button
                key={option}
                type="button"
                role="tab"
                className={`wardrobe-tab${slot === option ? ' is-active' : ''}`}
                aria-selected={slot === option}
                onClick={() => setSlot(option)}
              >
                {slotLabel(option)}
              </button>
            ))}
          </div>
          <div className="wardrobe-grid">
            {owned.map((id) => (
              <OwnedCard
                key={id}
                id={id}
                slot={slot}
                body={body}
                equipped={unlocks.equipped[slot] === id}
              />
            ))}
            {locked.map((id) => (
              <LockedCard key={id} id={id} />
            ))}
          </div>
        </div>
      </div>
      <button type="button" className="primary-button wide" onClick={close}>
        {m.pause_continue()}
      </button>
    </Dialog>
  )
}

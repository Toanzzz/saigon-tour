import {
  UNLOCK_SLOTS,
  UNLOCKS,
  type UnlockId,
  type UnlockSlot,
} from '@saigon/shared'
import { useSelector } from '@tanstack/react-store'
import { close } from '@/app/actions'
import { m, slotLabel } from '@/shared/i18n'
import { game } from '@/shared/state/game'
import { setWardrobeTab, wardrobeTab } from '@/shared/state/ui'
import { Dialog } from '@/shared/ui/dialog'
import { OwnedCard } from './item-card'
import { WardrobeStage } from './stage'

/** Owned ids for a slot, in catalog order. Locked items stay hidden. */
function ownedForSlot(slot: UnlockSlot, owned: readonly string[]) {
  const ownedSet = new Set(owned)
  return Object.values(UNLOCKS)
    .filter((entry) => entry.slot === slot && ownedSet.has(entry.id))
    .map((entry) => entry.id as UnlockId)
}

export function WardrobePanel() {
  const unlocks = useSelector(game, (s) => s.unlocks)
  const body = useSelector(game, (s) => s.body)
  const slot = useSelector(wardrobeTab, (s) => s.slot)
  const owned = ownedForSlot(slot, unlocks.owned)

  return (
    <Dialog
      title={m.wardrobe_title()}
      onClose={close}
      className="wardrobe-dialog"
    >
      <div className="wardrobe-body-layout">
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
                onClick={() => setWardrobeTab(option)}
              >
                {slotLabel(option)}
              </button>
            ))}
          </div>
          {owned.length ? (
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
            </div>
          ) : (
            <p className="wardrobe-empty">{m.wardrobe_slot_empty()}</p>
          )}
        </div>
      </div>
      <button type="button" className="primary-button wide" onClick={close}>
        {m.pause_continue()}
      </button>
    </Dialog>
  )
}

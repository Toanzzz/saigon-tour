import {
  UNLOCK_SLOTS,
  UNLOCKS,
  type UnlockId,
  type UnlockSlot,
} from '@saigon/shared'
import { useSelector } from '@tanstack/react-store'
import { close } from '@/app/actions'
import { equipUnlock } from '@/shared/api/wardrobe'
import { m, npcLabel, slotLabel, tierLabel, unlockLabel } from '@/shared/i18n'
import { game, update } from '@/shared/state/game'
import { Dialog } from '@/shared/ui/dialog'
import { Icon } from '@/shared/ui/icons'

export function WardrobeButton() {
  return (
    <button
      type="button"
      className="icon-button wardrobe-button"
      aria-label={m.wardrobe_open()}
      onClick={() => update({ panel: 'wardrobe' })}
    >
      <Icon name="star" />
    </button>
  )
}

/** Unlock ids for a slot, grouped into owned and still-locked. */
function slotEntries(slot: UnlockSlot, owned: readonly string[]) {
  const all = Object.values(UNLOCKS)
    .filter((entry) => entry.slot === slot)
    .map((entry) => entry.id as UnlockId)
  const ownedSet = new Set(owned)
  return {
    owned: all.filter((id) => ownedSet.has(id)),
    locked: all.filter((id) => !ownedSet.has(id)),
  }
}

export function WardrobePanel() {
  const unlocks = useSelector(game, (s) => s.unlocks)
  return (
    <Dialog
      title={m.wardrobe_title()}
      onClose={close}
      className="wardrobe-dialog"
    >
      <div className="wardrobe-slots">
        {UNLOCK_SLOTS.map((slot) => {
          const { owned, locked } = slotEntries(slot, unlocks.owned)
          const current = unlocks.equipped[slot] ?? null
          return (
            <section key={slot} className="wardrobe-slot">
              <h3>{slotLabel(slot)}</h3>
              <div className="wardrobe-options">
                <button
                  type="button"
                  className={`wardrobe-chip${current === null ? ' is-equipped' : ''}`}
                  aria-pressed={current === null}
                  onClick={() => equipUnlock(slot, null)}
                >
                  {m.wardrobe_empty_slot()}
                </button>
                {owned.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className={`wardrobe-chip${current === id ? ' is-equipped' : ''}`}
                    aria-pressed={current === id}
                    onClick={() => equipUnlock(slot, id)}
                  >
                    {unlockLabel(id)}
                  </button>
                ))}
                {locked.map((id) => (
                  <span
                    key={id}
                    className="wardrobe-chip is-locked"
                    title={m.wardrobe_locked_hint({
                      giver: npcLabel(UNLOCKS[id].giver),
                      tier: tierLabel(UNLOCKS[id].tier),
                    })}
                  >
                    <Icon name="lock" size={12} />
                    {unlockLabel(id)}
                  </span>
                ))}
              </div>
            </section>
          )
        })}
      </div>
      <button type="button" className="primary-button wide" onClick={close}>
        {m.pause_continue()}
      </button>
    </Dialog>
  )
}

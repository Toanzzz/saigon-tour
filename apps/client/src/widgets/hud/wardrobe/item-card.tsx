import type { AvatarBody, UnlockId, UnlockSlot } from '@saigon/shared'
import { UNLOCKS } from '@saigon/shared'
import { equipUnlock } from '@/shared/api/wardrobe'
import { m, npcLabel, tierLabel, unlockLabel } from '@/shared/i18n'
import { Icon } from '@/shared/ui/icons'
import { AvatarLights } from '@/shared/world'
import { ItemModel } from './item-model'
import { ViewSlot } from './view-slot'

/** An owned item: a spinning 3D thumbnail, its name, and an equip toggle. */
export function OwnedCard({
  id,
  slot,
  body,
  equipped,
}: {
  id: UnlockId
  slot: UnlockSlot
  body: AvatarBody
  equipped: boolean
}) {
  return (
    <div className={`wardrobe-card${equipped ? ' is-equipped' : ''}`}>
      <ViewSlot className="wardrobe-card-stage">
        <AvatarLights />
        <ItemModel id={id} slot={slot} body={body} />
      </ViewSlot>
      <span className="wardrobe-card-name">{unlockLabel(id)}</span>
      <button
        type="button"
        className="wardrobe-card-equip"
        aria-pressed={equipped}
        onClick={() => equipUnlock(slot, equipped ? null : id)}
      >
        {equipped ? m.wardrobe_unequip() : m.wardrobe_equip()}
      </button>
    </div>
  )
}

/** A still-locked item: a lock icon and the earn hint, with no 3D loaded. */
export function LockedCard({ id }: { id: UnlockId }) {
  const def = UNLOCKS[id]
  return (
    <div
      className="wardrobe-card is-locked"
      title={m.wardrobe_locked_hint({
        giver: npcLabel(def.giver),
        tier: tierLabel(def.tier),
      })}
    >
      <div className="wardrobe-card-stage wardrobe-card-locked">
        <Icon name="lock" size={22} />
      </div>
      <span className="wardrobe-card-name">{unlockLabel(id)}</span>
    </div>
  )
}

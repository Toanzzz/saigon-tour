import type { AvatarBody, UnlockId, UnlockSlot } from '@saigon/shared'
import { equipUnlock } from '@/shared/api/wardrobe'
import { m, unlockLabel } from '@/shared/i18n'
import { WardrobeThumbnail } from '@/shared/ui/wardrobe-thumbnail'

/** A baked view of the reward on the selected body and an equip toggle. */
export function OwnedCard({
  id,
  slot,
  body,
  equipped,
  onEquip = equipUnlock,
}: {
  id: UnlockId
  slot: UnlockSlot
  body: AvatarBody
  equipped: boolean
  onEquip?: (slot: UnlockSlot, id: UnlockId | null) => unknown
}) {
  return (
    <div className={`wardrobe-card${equipped ? ' is-equipped' : ''}`}>
      <div className="wardrobe-card-stage">
        <WardrobeThumbnail body={body} id={id} />
      </div>
      <span className="wardrobe-card-name">{unlockLabel(id)}</span>
      <button
        type="button"
        className="wardrobe-card-equip"
        aria-pressed={equipped}
        onClick={() => onEquip(slot, equipped ? null : id)}
      >
        {equipped ? m.wardrobe_unequip() : m.wardrobe_equip()}
      </button>
    </div>
  )
}

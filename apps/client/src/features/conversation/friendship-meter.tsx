import { type FriendshipMap, friendlinessOf, type NpcId } from '@saigon/shared'
import { m } from '@/shared/i18n'
export function FriendshipMeter({
  npcId,
  friendship,
}: {
  npcId: NpcId
  friendship: FriendshipMap
}) {
  const level = friendlinessOf(friendship, npcId)
  return (
    <div className="friendship-summary">
      <span>
        {m.friendship_label()}: {level > 0 ? '+' : ''}
        {level} ♥ ·{' '}
        {level <= -3
          ? m.friendship_cold()
          : level >= 2
            ? m.friendship_warm()
            : m.friendship_neutral()}
      </span>
      <meter
        className="friendship-meter"
        min={-5}
        max={5}
        value={level}
        aria-label={m.friendship_label()}
        aria-valuemin={-5}
        aria-valuemax={5}
        aria-valuenow={level}
        aria-valuetext={
          level <= -3
            ? m.friendship_cold()
            : level >= 2
              ? m.friendship_warm()
              : m.friendship_neutral()
        }
      >
        {m.friendship_label()}: {level > 0 ? '+' : ''}
        {level} ♥
      </meter>
    </div>
  )
}

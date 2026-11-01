import {
  FRIENDSHIP_MAX,
  FRIENDSHIP_MIN,
  type FriendshipMap,
  friendlinessOf,
  type NpcId,
} from '@saigon/shared'
import { useSelector } from '@tanstack/react-store'
import { m } from '@/shared/i18n'
import { pulses } from '@/shared/state/friendship'
import { game } from '@/shared/state/game'

const COLD_AT = -3
const WARM_AT = 2
const PIPS = Array.from({ length: FRIENDSHIP_MAX - FRIENDSHIP_MIN }, (_, i) =>
  i < -FRIENDSHIP_MIN ? i + FRIENDSHIP_MIN : i + FRIENDSHIP_MIN + 1
)
const tierOf = (level: number) =>
  level <= COLD_AT ? 'cold' : level >= WARM_AT ? 'warm' : 'neutral'
const TIER = {
  cold: { glyph: '❄', label: m.friendship_cold },
  neutral: { glyph: '•', label: m.friendship_neutral },
  warm: { glyph: '♥', label: m.friendship_warm },
}

const isFilled = (pip: number, level: number) =>
  pip < 0 ? level <= pip : level >= pip

function hint(level: number) {
  if (level <= COLD_AT)
    return m.friendship_to_neutral({ points: COLD_AT + 1 - level })
  if (level < WARM_AT) return m.friendship_to_warm({ points: WARM_AT - level })
  return level >= FRIENDSHIP_MAX ? m.friendship_max() : ''
}

export function FriendshipMeter({
  npcId,
  friendship,
}: {
  npcId: NpcId
  friendship: FriendshipMap
}) {
  const level = friendlinessOf(friendship, npcId)
  const pulse = useSelector(pulses, (state) => state[npcId])
  const still = useSelector(game, (state) => state.reducedMotion)
  const recent = pulse && Date.now() - pulse.at < 2200 ? pulse : undefined
  const tier = tierOf(level)
  const label = TIER[tier].label()
  const next = hint(level)
  const signed = `${level > 0 ? '+' : ''}${level}`
  return (
    <div className={`friendship-summary tier-${tier}${still ? ' still' : ''}`}>
      <span className="friendship-tier">
        <span aria-hidden="true">{TIER[tier].glyph}</span> {label}
      </span>
      <meter
        className="sr-only"
        min={FRIENDSHIP_MIN}
        max={FRIENDSHIP_MAX}
        value={level}
        aria-label={m.friendship_label()}
        aria-valuetext={`${signed} · ${label}`}
      >
        {signed}
      </meter>
      <div
        className="friendship-pips"
        aria-hidden="true"
        title={`${m.friendship_label()}: ${signed}`}
      >
        {PIPS.map((pip) => {
          const filled = isFilled(pip, level)
          const changed =
            recent && filled !== isFilled(pip, level - recent.delta)
          return (
            <span
              key={`${pip}-${changed ? recent.at : 0}`}
              className={`pip ${pip < 0 ? 'cool' : 'warm'}${filled ? ' on' : ''}${changed ? ' changed' : ''}${pip === 1 ? ' after-center' : ''}`}
            />
          )
        })}
      </div>
      {next && <span className="friendship-hint">{next}</span>}
    </div>
  )
}

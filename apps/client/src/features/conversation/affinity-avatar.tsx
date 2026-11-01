import {
  FRIENDSHIP_MAX,
  FRIENDSHIP_MIN,
  FRIENDSHIP_TIERS,
  type FriendshipMap,
  friendlinessOf,
  GIVER_UNLOCKS,
  NPCS,
  type NpcId,
  UNLOCKS,
} from '@saigon/shared'
import { useSelector } from '@tanstack/react-store'
import { m, tierLabel, unlockLabel } from '@/shared/i18n'
import { pulses } from '@/shared/state/friendship'
import { game } from '@/shared/state/game'
import {
  AFFINITY_TIERS,
  AffinityIcon,
  affinityTier,
} from '@/shared/ui/affinity'
import { NpcAvatar } from './npc-avatar'

/** Portrait avatar that doubles as the affinity control and popover. */
export function AffinityAvatar({
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
  const { index, tier } = affinityTier(level)
  const label = tier.label()
  const next = AFFINITY_TIERS[index + 1]
  const signed = `${level > 0 ? '+' : ''}${level}`
  const owned = useSelector(game, (state) => state.unlocks.owned)
  const nextUnlock = (GIVER_UNLOCKS[npcId as keyof typeof GIVER_UNLOCKS] ?? [])
    .map((id) => UNLOCKS[id])
    .find((entry) => entry && !owned.includes(entry.id))
  return (
    <div className={`affinity${still ? ' still' : ''}`}>
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
      <button
        type="button"
        key={recent?.at ?? 0}
        className={`affinity-portrait${recent ? (recent.delta > 0 ? ' up' : ' down') : ''}`}
        popoverTarget="affinity-info"
        aria-label={m.friendship_badge({ tier: label })}
      >
        <NpcAvatar id={npcId} size="lg" />
        <span className={`affinity-crest tier-${tier.id}`} aria-hidden="true">
          <AffinityIcon tier={tier.id} size={18} />
        </span>
      </button>
      <div id="affinity-info" className="affinity-info" popover="auto">
        <div className="affinity-info-head">
          <AffinityIcon tier={tier.id} size={34} />
          <div>
            <strong>{label}</strong>
            <span>
              {m.friendship_label()} {signed}
            </span>
          </div>
        </div>
        <ol className="affinity-ladder">
          {AFFINITY_TIERS.map((step, i) => (
            <li
              key={step.id}
              className={i === index ? 'current' : i < index ? 'passed' : ''}
              title={step.label()}
              aria-current={i === index ? 'step' : undefined}
            >
              <AffinityIcon tier={step.id} size={i === index ? 24 : 18} />
              <span className="sr-only">{step.label()}</span>
            </li>
          ))}
        </ol>
        <p className="affinity-next">
          {next
            ? m.friendship_next({
                points: next.min - level,
                tier: next.label(),
              })
            : m.friendship_top()}
        </p>
        {nextUnlock && level < FRIENDSHIP_TIERS[nextUnlock.tier] && (
          <p className="affinity-unlock">
            {m.tier_unlocks_hint({
              tier: tierLabel(nextUnlock.tier),
              item: unlockLabel(nextUnlock.id),
            })}
          </p>
        )}
        <p className="affinity-tip">
          {tier.id === 'cold'
            ? m.errands_cold({ name: NPCS[npcId].name })
            : m.friendship_tip()}
        </p>
      </div>
    </div>
  )
}

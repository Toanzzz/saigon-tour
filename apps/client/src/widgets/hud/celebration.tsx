import { useSelector } from '@tanstack/react-store'
import { m } from '@/shared/i18n'
import { game } from '@/shared/state/game'
import { Icon } from '@/shared/ui/icons'

/**
 * Transient burst shown when an errand is accepted or completed. It reinforces
 * the jingle with a centered badge and a short ring; reduced motion drops the
 * animation to a quiet fade handled in CSS.
 */
export function Celebration() {
  const celebrate = useSelector(game, (state) => state.celebrate)
  if (!celebrate) return null
  const label =
    celebrate.kind === 'completed'
      ? m.celebrate_completed()
      : m.celebrate_accepted()
  return (
    <div
      key={celebrate.at}
      className={`celebration celebration-${celebrate.kind}`}
      role="status"
      aria-live="polite"
    >
      <span className="celebration-ring" aria-hidden="true" />
      <span className="celebration-badge">
        <Icon
          name={celebrate.kind === 'completed' ? 'star' : 'check'}
          size={28}
        />
      </span>
      <span className="celebration-label">{label}</span>
    </div>
  )
}

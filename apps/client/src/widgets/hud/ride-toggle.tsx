import { useSelector } from '@tanstack/react-store'
import { ownedVehicle, toggleVehicle } from '@/shared/api/wardrobe'
import { m } from '@/shared/i18n'
import { game } from '@/shared/state/game'
import { Icon } from '@/shared/ui/icons'

/**
 * A quick mount/dismount control for the earned personal ride. It only renders
 * once the player owns a vehicle; the same action is bound to the `B` key. On
 * foot it speeds up walking (`UNLOCKS[vehicle].speed`); tapping again hops off.
 */
export function RideToggle() {
  const owned = useSelector(game, (s) => ownedVehicle(s) !== null)
  const mounted = useSelector(game, (s) => Boolean(s.unlocks.equipped.vehicle))
  if (!owned) return null
  return (
    <button
      type="button"
      className={mounted ? 'ride-toggle is-mounted' : 'ride-toggle'}
      aria-pressed={mounted}
      onClick={() => toggleVehicle()}
    >
      <Icon name="bike" size={22} />
      <span>{mounted ? m.hud_hop_off() : m.hud_hop_on()}</span>
      <kbd>B</kbd>
    </button>
  )
}

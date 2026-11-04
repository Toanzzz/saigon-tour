import { Html } from '@react-three/drei'
import { useSelector } from '@tanstack/react-store'
import { m, marketItemLabel } from '@/shared/i18n'
import { game } from '@/shared/state/game'
import { xr } from '@/shared/xr/store'
import { stamina } from './store'
import './style.css'

/** A screen-facing ink-and-paper gauge anchored above the local avatar. */
export function StaminaBar() {
  const view = useSelector(stamina, (value) => value)
  const showing = useSelector(
    game,
    (state) => state.screen === 'playing' && !state.ride
  )
  const reduced = useSelector(game, (state) => state.reducedMotion)
  const xrPresenting = useSelector(xr, (state) => state.presenting)
  if (!showing || xrPresenting) return null
  const used = view.usedAt > 0 && view.now - view.usedAt < 650
  const state = view.boosted ? 'boosted' : view.current <= 25 ? 'low' : 'normal'
  return (
    <Html
      center
      position={[0, 2.65, 0]}
      zIndexRange={[20, 0]}
      style={{ pointerEvents: 'none' }}
    >
      <div
        id="stamina-meter"
        className={`stamina-overhead is-${state}${used && !reduced ? ' is-restored' : ''}`}
        role="progressbar"
        aria-label={
          view.boosted
            ? `${m.stamina_label()} · ${marketItemLabel('coffee')}`
            : m.stamina_label()
        }
        aria-valuemin={0}
        aria-valuemax={view.max}
        aria-valuenow={view.current}
        aria-valuetext={
          view.exhausted
            ? m.stamina_exhausted()
            : `${Math.ceil(view.current)}/${view.max}`
        }
      >
        <span
          className="stamina-overhead-fill"
          style={{ transform: `scaleX(${view.current / view.max})` }}
        />
        {view.boosted && (
          <svg
            className="stamina-overhead-bean"
            viewBox="0 0 12 14"
            aria-hidden="true"
          >
            <ellipse cx="6" cy="7" rx="4.5" ry="6" />
            <path d="M7.5 2C2 5 10 9 4.5 12" />
          </svg>
        )}
      </div>
    </Html>
  )
}

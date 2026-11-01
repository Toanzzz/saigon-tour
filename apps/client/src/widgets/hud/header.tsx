import { useEffect, useRef, useState } from 'react'
import { canOpenHub, openHub, pause } from '@/app/actions'
import { m } from '@/shared/i18n'
import { type GameState, update } from '@/shared/state/game'
import { CoinEmblem } from '@/shared/ui/coin-emblem'
import { Icon } from '@/shared/ui/icons'
import { placeName } from '@/shared/world/places'
import { XRSessionButton, xrStore } from '@/shared/xr'
import { PeopleButton } from './people'

/** A brief wallet pulse + floating "+N" whenever the coin balance rises
 * (pickups, quest rewards). Keyed by a bump counter so each gain restarts the
 * animation; reduced motion fades without the bounce. HUD-local — it reads the
 * balance delta, never the 3D scene. */
function useCoinGain(currency: number) {
  const previous = useRef(currency)
  const bump = useRef(0)
  const [gain, setGain] = useState<{ amount: number; key: number } | null>(null)
  useEffect(() => {
    const delta = currency - previous.current
    previous.current = currency
    if (delta <= 0) return
    bump.current += 1
    setGain({ amount: delta, key: bump.current })
    const timer = setTimeout(() => setGain(null), 1200)
    return () => clearTimeout(timer)
  }, [currency])
  return gain
}

export function GameHeader({ state }: { state: GameState }) {
  const canHub = canOpenHub(state)
  const gain = useCoinGain(state.world.currency)
  const still = state.reducedMotion
  return (
    <header className="game-header">
      <div className="game-identity">
        <span>Sài Gòn</span>
        <small>{placeName(state.world.locationId)}</small>
      </div>
      <nav className="header-tools" aria-label={m.header_controls()}>
        <PeopleButton />
        <span
          className={`wallet${gain ? (still ? ' is-gaining still' : ' is-gaining') : ''}`}
        >
          <span className="sr-only">{m.header_coins()}</span>
          <CoinEmblem />
          <b>{state.world.currency}</b>
          {gain && (
            <span key={gain.key} className="wallet-gain" aria-hidden="true">
              +{gain.amount}
            </span>
          )}
        </span>
        <button
          type="button"
          className="icon-button"
          aria-label={m.header_open_hub()}
          title={m.header_hub_title()}
          disabled={!canHub}
          onClick={openHub}
        >
          <Icon name="home" />
        </button>
        <button
          type="button"
          className="icon-button desktop-only"
          aria-label={m.header_open_journal()}
          onClick={() => update({ panel: 'journal' })}
        >
          <Icon name="book" />
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label={m.wardrobe_open()}
          onClick={() => update({ panel: 'wardrobe' })}
        >
          <Icon name="star" />
        </button>
        <XRSessionButton store={xrStore} />
        <button
          type="button"
          className="icon-button"
          aria-label={state.muted ? m.header_unmute() : m.header_mute()}
          onClick={() => update({ muted: !state.muted })}
        >
          <Icon name={state.muted ? 'muted' : 'sound'} />
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label={m.header_pause()}
          onClick={pause}
        >
          <Icon name="pause" />
        </button>
      </nav>
    </header>
  )
}

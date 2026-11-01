import { canOpenHub, openHub, pause } from '@/app/actions'
import { m } from '@/shared/i18n'
import { type GameState, update } from '@/shared/state/game'
import { Icon } from '@/shared/ui/icons'
import { placeName } from '@/shared/world/places'
import { XRSessionButton, xrStore } from '@/shared/xr'
import { PeopleButton } from './people'

export function GameHeader({ state }: { state: GameState }) {
  const canHub = canOpenHub(state)
  return (
    <header className="game-header">
      <div className="game-identity">
        <span>Sài Gòn</span>
        <small>{placeName(state.world.locationId)}</small>
      </div>
      <nav className="header-tools" aria-label={m.header_controls()}>
        <PeopleButton />
        <span className="wallet">
          <span className="sr-only">{m.header_coins()}</span>
          <Icon name="coin" />
          <b>{state.world.currency}</b>
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

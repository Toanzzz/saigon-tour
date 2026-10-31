import { canOpenHub, openHub, pause } from '@/app/actions'
import { type GameState, update } from '@/shared/state/game'
import { Icon } from '@/shared/ui/icons'
import { PLACES } from '@/shared/world/places'
import { XRSessionButton, xrStore } from '@/shared/xr'
import { PeopleButton } from './people'

export function GameHeader({ state }: { state: GameState }) {
  const canHub = canOpenHub(state)
  return (
    <header className="game-header">
      <div className="game-identity">
        <span>Sài Gòn</span>
        <small>{PLACES[state.world.locationId].name}</small>
      </div>
      <nav className="header-tools" aria-label="Game controls">
        <PeopleButton />
        <span className="wallet">
          <span className="sr-only">Coins</span>
          <Icon name="coin" />
          <b>{state.world.currency}</b>
        </span>
        <button
          type="button"
          className="icon-button"
          aria-label="Open city hub"
          title="City hub (H)"
          disabled={!canHub}
          onClick={openHub}
        >
          <Icon name="home" />
        </button>
        <button
          type="button"
          className="icon-button desktop-only"
          aria-label="Open journal"
          onClick={() => update({ panel: 'journal' })}
        >
          <Icon name="book" />
        </button>
        <XRSessionButton store={xrStore} />
        <button
          type="button"
          className="icon-button"
          aria-label={state.muted ? 'Unmute audio' : 'Mute audio'}
          onClick={() => update({ muted: !state.muted })}
        >
          <Icon name={state.muted ? 'muted' : 'sound'} />
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label="Pause game"
          onClick={pause}
        >
          <Icon name="pause" />
        </button>
      </nav>
    </header>
  )
}

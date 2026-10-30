import { useState } from 'react'
import { board, close, pause, restart } from '../core/actions'
import { MODES, PLACES, type TravelMode } from '../core/places'
import { type GameState, game, update } from '../state/game'
import { Dialog } from './dialog'
import { Icon } from './icons'
import { NeighborhoodMap } from './map'

export function TransportPanel({ state }: { state: GameState }) {
  const [mode, setMode] = useState<TravelMode>('bus')
  const [destination, setDestination] = useState<keyof typeof PLACES>(
    state.stop === 'park' ? 'market' : 'park'
  )
  const fare = MODES[mode].fare
  const affordable = state.world.currency >= fare
  return (
    <Dialog
      title="Where shall we go?"
      eyebrow={PLACES[state.stop].name}
      onClose={close}
      className="transport-dialog"
    >
      <p className="panel-intro">A window seat. A new corner of the city.</p>
      <fieldset className="ride-options">
        <legend>Your ride</legend>
        {Object.entries(MODES).map(([id, item]) => (
          <button
            type="button"
            key={id}
            className={`ride-choice ${mode === id ? 'selected' : ''}`}
            aria-pressed={mode === id}
            onClick={() => setMode(id as TravelMode)}
          >
            <span>{item.name}</span>
            <small>{item.fare} coins</small>
          </button>
        ))}
      </fieldset>
      <p className="ride-description">{MODES[mode].description}</p>
      <label className="field-label" htmlFor="ride-destination">
        Destination
      </label>
      <select
        id="ride-destination"
        value={destination}
        onChange={(event) =>
          setDestination(event.target.value as keyof typeof PLACES)
        }
      >
        {Object.entries(PLACES)
          .filter(([id]) => id !== state.stop)
          .map(([id, place]) => (
            <option key={id} value={id}>
              {place.name}
            </option>
          ))}
      </select>
      <div className="fare-row">
        <span>Your wallet</span>
        <strong>{state.world.currency} coins</strong>
      </div>
      <button
        type="button"
        className="primary-button wide"
        disabled={!affordable}
        onClick={() => board(destination, mode)}
      >
        <Icon name="bus" />
        Board {MODES[mode].name}
        <span>{fare} coins</span>
      </button>
      {!affordable && (
        <p className="help-text" role="status">
          Not enough coins for this ride. Walking is always free.
        </p>
      )}
    </Dialog>
  )
}

export function JournalPanel({ state }: { state: GameState }) {
  return (
    <Dialog
      title="Your little journey"
      eyebrow="Travel journal"
      onClose={close}
    >
      <div className="journal-section">
        <h3>On your mind</h3>
        {state.quest ? (
          <>
            <h4>{state.quest.title}</h4>
            <p>{state.quest.description}</p>
            <span className="journal-reward">
              <Icon name="coin" size={16} />
              {state.quest.reward.currency} coins · a Sài Gòn postcard
            </span>
          </>
        ) : (
          <p>
            {state.completed.length
              ? 'A kind errand, a new friend. There is still a whole neighborhood to enjoy.'
              : 'Cô Hoa is at the market stall. Say hello and see if she could use a hand.'}
          </p>
        )}
      </div>
      <div className="journal-section">
        <h3>In your bag</h3>
        <div className="bag-items">
          <span>
            <Icon name="coin" />
            {state.world.currency} coins
          </span>
          {(state.world.inventory.herbs ?? 0) > 0 && (
            <span>
              <Icon name="leaf" />
              Fresh herbs × {state.world.inventory.herbs}
            </span>
          )}
          {(state.world.inventory.postcard ?? 0) > 0 && (
            <span>
              <Icon name="map" />
              Sài Gòn postcard × {state.world.inventory.postcard}
            </span>
          )}
        </div>
      </div>
      <div className="journal-section">
        <h3>Good memories</h3>
        {state.completed.length ? (
          state.completed.map((quest) => (
            <p className="completed-errand" key={quest.id}>
              <Icon name="check" />
              {quest.title}
            </p>
          ))
        ) : (
          <p className="muted-copy">Your first story is waiting to happen.</p>
        )}
      </div>
      <button type="button" className="primary-button wide" onClick={close}>
        Continue exploring
      </button>
    </Dialog>
  )
}

export function MapPanel({ state }: { state: GameState }) {
  return (
    <Dialog
      title="A city of small stories"
      eyebrow="Your neighborhood"
      onClose={close}
      className="map-dialog"
    >
      <NeighborhoodMap state={state} large />
      <div className="map-legend">
        <span>
          <i /> You
        </span>
        <span>
          <i className="stop" /> Transport stops
        </span>
        <span>{state.world.visitedLocations.length}/4 places discovered</span>
      </div>
      <p className="panel-intro">
        Take a ride or follow your curiosity. Every street leads somewhere.
      </p>
    </Dialog>
  )
}

export function PausePanel({ state }: { state: GameState }) {
  const resume = () => {
    if (game.state.screen === 'paused') pause()
    close()
  }
  return (
    <Dialog
      title="Take your time."
      eyebrow="The city can wait"
      onClose={resume}
      className="pause-dialog"
    >
      <button type="button" className="primary-button wide" onClick={resume}>
        Continue exploring
      </button>
      <div className="settings-row">
        <label htmlFor="game-volume">City sounds</label>
        <output>{Math.round(state.volume * 100)}%</output>
      </div>
      <input
        id="game-volume"
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={state.volume}
        onChange={(event) => update({ volume: Number(event.target.value) })}
      />
      <label className="setting-checkbox">
        <span>Mute audio</span>
        <input
          type="checkbox"
          checked={state.muted}
          onChange={(event) => update({ muted: event.target.checked })}
        />
      </label>
      <label className="setting-checkbox">
        <span>Reduce camera motion</span>
        <input
          type="checkbox"
          checked={state.reducedMotion}
          onChange={(event) => update({ reducedMotion: event.target.checked })}
        />
      </label>
      <div className="controls-reference">
        <span>
          <kbd>W A S D</kbd> Move
        </span>
        <span>
          <kbd>Drag</kbd> Look around
        </span>
        <span>
          <kbd>Shift</kbd> Stroll faster
        </span>
        <span>
          <kbd>E</kbd> Talk or ride
        </span>
        <span>
          <kbd>J</kbd> Journal
        </span>
        <span>
          <kbd>M</kbd> Map
        </span>
      </div>
      <button
        type="button"
        className="text-button restart-button"
        onClick={restart}
      >
        Start a new journey
      </button>
    </Dialog>
  )
}

export function RewardPanel({ state }: { state: GameState }) {
  return (
    <Dialog
      title="A little kindness goes far."
      eyebrow="A good day in Sài Gòn"
      onClose={close}
      className="reward-dialog"
    >
      <div className="postcard" role="img" aria-label="Sài Gòn postcard earned">
        <span className="postcard-mark">Sài Gòn</span>
        <span>with love, from the neighborhood</span>
        <i className="postcard-stamp">
          <Icon name="star" size={28} />
        </i>
      </div>
      <p className="reward-copy">
        The herbs made it to Chị Linh’s community lunch. Cô Hoa sends her
        thanks.
      </p>
      <div className="reward-earned">
        <span>
          <Icon name="coin" />+{state.reward} coins
        </span>
        <span>
          <Icon name="star" />A new friend
        </span>
      </div>
      <button type="button" className="primary-button wide" onClick={close}>
        Continue exploring
      </button>
      <button
        type="button"
        className="text-button restart-button"
        onClick={restart}
      >
        Start a new journey
      </button>
    </Dialog>
  )
}

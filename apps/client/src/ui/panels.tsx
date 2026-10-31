import { MARKET_ITEMS, type MarketItemId } from '@saigon/shared'
import { useStore } from '@tanstack/react-store'
import { useState } from 'react'
import {
  board,
  buyMarketItem,
  close,
  pause,
  restart,
  toggleTimeOfDay,
} from '../core/actions'
import { MODES, PLACES, type TravelMode } from '../core/places'
import { teamObjective } from '../net/party'
import { net } from '../net/status'
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
  const network = useStore(net, (value) => value)
  const team = teamObjective(network.party, network.selfId)
  return (
    <Dialog
      title="Your little journey"
      eyebrow="Travel journal"
      onClose={close}
    >
      {team && (
        <section className="journal-section" aria-label="Team errand progress">
          <h3>{team.title}</h3>
          <p>{team.hint}</p>
          <p>{team.progress}</p>
          <ul>
            {network.party?.quest?.assignments.map((assignment) => (
              <li key={assignment.playerId}>
                {assignment.name}: {assignment.dish} ·{' '}
                {assignment.delivered ? 'delivered' : 'on the way'}
              </li>
            ))}
          </ul>
          <span className="journal-reward">
            40 coins · a group photo · +2 reputation each
          </span>
        </section>
      )}
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
          {(state.world.inventory.photo ?? 0) > 0 && (
            <span>
              <Icon name="star" />
              Group photo × {state.world.inventory.photo}
            </span>
          )}
          {(state.world.inventory.coffee ?? 0) > 0 && (
            <span>
              <Icon name="sound" />
              Cà phê sữa × {state.world.inventory.coffee}
            </span>
          )}
          {(state.world.inventory.banana ?? 0) > 0 && (
            <span>
              <Icon name="leaf" />
              Chuối chín × {state.world.inventory.banana}
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
        <span>
          {state.world.visitedLocations.length}/{Object.keys(PLACES).length}{' '}
          places discovered
        </span>
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
        <span>Evening city lights</span>
        <input
          type="checkbox"
          checked={state.timeOfDay === 'evening'}
          onChange={toggleTimeOfDay}
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
        disabled={state.guestStatus === 'resetting'}
        onClick={restart}
      >
        Start a new journey
      </button>
    </Dialog>
  )
}

export function MarketPanel({ state }: { state: GameState }) {
  return (
    <Dialog
      title="A little market break"
      eyebrow="Bến Thành market"
      onClose={close}
      className="market-dialog"
    >
      <p className="panel-intro">
        Pick up a small taste for the road. Purchases stay in your saved bag.
      </p>
      <div className="market-items">
        {(Object.keys(MARKET_ITEMS) as MarketItemId[]).map((id) => {
          const item = MARKET_ITEMS[id]
          const count = state.world.inventory[id] ?? 0
          return (
            <button
              type="button"
              className="market-item"
              key={id}
              disabled={state.world.currency < item.price}
              onClick={() => buyMarketItem(id)}
            >
              <span>
                <strong>{item.label}</strong>
                <small>
                  {id === 'coffee'
                    ? 'A warm cup for the walk'
                    : 'A bright snack from the stall'}
                </small>
              </span>
              <span className="market-price">
                {item.price} coins · ×{count}
              </span>
            </button>
          )
        })}
      </div>
      <div className="fare-row">
        <span>Your wallet</span>
        <strong>{state.world.currency} coins</strong>
      </div>
    </Dialog>
  )
}

export function PostcardPanel() {
  return (
    <Dialog
      title="A river postcard"
      eyebrow="Bạch Đằng waterfront"
      onClose={close}
      className="postcard-dialog"
    >
      <p className="panel-intro">
        The river opens the skyline. Pause here, then return to the promenade
        whenever you are ready.
      </p>
      <button type="button" className="primary-button wide" onClick={close}>
        Return to the riverside
      </button>
    </Dialog>
  )
}

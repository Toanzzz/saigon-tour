import { MARKET_ITEMS, type MarketItemId } from '@saigon/shared'
import { useState } from 'react'
import {
  board,
  buyMarketItem,
  close,
  forgetDevice,
  pause,
  toggleTimeOfDay,
} from '@/app/actions'
import { NewJourneyButton } from '@/app/title-journey'
import { MarkerGuide } from '@/features/conversation/marker-guide'
import { NeighborhoodMap } from '@/features/map/map'
import { LanguageSelect, m, marketItemLabel } from '@/shared/i18n'
import { type GameState, game, update } from '@/shared/state/game'
import { Dialog } from '@/shared/ui/dialog'
import { Icon } from '@/shared/ui/icons'
import {
  MODES,
  modeDescription,
  modeName,
  PLACES,
  placeName,
  type TravelMode,
} from '@/shared/world/places'
import { PauseName } from './pause-name'

export function TransportPanel({ state }: { state: GameState }) {
  const [mode, setMode] = useState<TravelMode>('bus')
  const [destination, setDestination] = useState<keyof typeof PLACES>(
    state.stop === 'park' ? 'market' : 'park'
  )
  const fare = MODES[mode].fare
  const affordable = state.world.currency >= fare
  return (
    <Dialog
      title={m.transport_title()}
      eyebrow={placeName(state.stop)}
      onClose={close}
      className="transport-dialog"
    >
      <p className="panel-intro">{m.transport_intro()}</p>
      <fieldset className="ride-options">
        <legend>{m.transport_your_ride()}</legend>
        {Object.entries(MODES).map(([id, item]) => (
          <button
            type="button"
            key={id}
            className={`ride-choice ${mode === id ? 'selected' : ''}`}
            aria-pressed={mode === id}
            onClick={() => setMode(id as TravelMode)}
          >
            <span>{modeName(id as TravelMode)}</span>
            <small>{m.coins({ count: item.fare })}</small>
          </button>
        ))}
      </fieldset>
      <p className="ride-description">{modeDescription(mode)}</p>
      <label className="field-label" htmlFor="ride-destination">
        {m.transport_destination()}
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
          .map(([id]) => (
            <option key={id} value={id}>
              {placeName(id as keyof typeof PLACES)}
            </option>
          ))}
      </select>
      <div className="fare-row">
        <span>{m.wallet()}</span>
        <strong>{m.coins({ count: state.world.currency })}</strong>
      </div>
      <button
        type="button"
        className="primary-button wide"
        disabled={!affordable}
        onClick={() => board(destination, mode)}
      >
        <Icon name="bus" />
        {m.transport_board({ mode: modeName(mode) })}
        <span>{m.coins({ count: fare })}</span>
      </button>
      {!affordable && (
        <p className="help-text" role="status">
          {m.transport_not_enough()}
        </p>
      )}
    </Dialog>
  )
}

export { JournalPanel } from './journal'

export function MapPanel({ state }: { state: GameState }) {
  return (
    <Dialog
      title={m.map_title()}
      eyebrow={m.map_eyebrow()}
      onClose={close}
      className="map-dialog"
    >
      <NeighborhoodMap state={state} large />
      <div className="map-legend">
        <span>
          <i /> {m.map_you()}
        </span>
        <span>
          <i className="stop" /> {m.map_stops()}
        </span>
        <span>
          {m.map_discovered({
            count: state.world.visitedLocations.length,
            total: Object.keys(PLACES).length,
          })}
        </span>
      </div>
      <p className="panel-intro">{m.map_intro()}</p>
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
      title={m.pause_title()}
      eyebrow={m.pause_eyebrow()}
      onClose={resume}
      className="pause-dialog"
    >
      <button type="button" className="primary-button wide" onClick={resume}>
        {m.pause_continue()}
      </button>
      <PauseName />
      <div className="settings-row">
        <label htmlFor="game-volume">{m.pause_city_sounds()}</label>
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
        <span>{m.pause_mute()}</span>
        <input
          type="checkbox"
          checked={state.muted}
          onChange={(event) => update({ muted: event.target.checked })}
        />
      </label>
      <label className="setting-checkbox">
        <span>{m.pause_evening()}</span>
        <input
          type="checkbox"
          checked={state.timeOfDay === 'evening'}
          onChange={toggleTimeOfDay}
        />
      </label>
      <label className="setting-checkbox">
        <span>{m.pause_reduce_motion()}</span>
        <input
          type="checkbox"
          checked={state.reducedMotion}
          onChange={(event) => update({ reducedMotion: event.target.checked })}
        />
      </label>
      <LanguageSelect />
      <div className="controls-reference">
        <span>
          <kbd>W A S D</kbd> {m.pause_key_move()}
        </span>
        <span>
          <kbd>{m.controls_drag()}</kbd> {m.pause_key_look()}
        </span>
        <span>
          <kbd>Shift</kbd> {m.pause_key_faster()}
        </span>
        <span>
          <kbd>E</kbd> {m.pause_key_talk()}
        </span>
        <span>
          <kbd>J</kbd> {m.pause_key_journal()}
        </span>
        <span>
          <kbd>M</kbd> {m.pause_key_map()}
        </span>
      </div>
      <MarkerGuide />
      <NewJourneyButton className="restart-button" />
      <button
        type="button"
        className="text-button restart-button"
        onClick={() => void forgetDevice()}
      >
        {m.pause_clear_data()}
      </button>
    </Dialog>
  )
}

export function MarketPanel({ state }: { state: GameState }) {
  return (
    <Dialog
      title={m.market_title()}
      eyebrow={placeName('market')}
      onClose={close}
      className="market-dialog"
    >
      <p className="panel-intro">{m.market_intro()}</p>
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
                <strong>{marketItemLabel(id)}</strong>
                <small>
                  {id === 'coffee' ? m.market_coffee() : m.market_banana()}
                </small>
              </span>
              <span className="market-price">
                {m.coins({ count: item.price })} · ×{count}
              </span>
            </button>
          )
        })}
      </div>
      <div className="fare-row">
        <span>{m.wallet()}</span>
        <strong>{m.coins({ count: state.world.currency })}</strong>
      </div>
    </Dialog>
  )
}

export function PostcardPanel() {
  return (
    <Dialog
      title={m.postcard_title()}
      eyebrow={m.postcard_eyebrow()}
      onClose={close}
      className="postcard-dialog"
    >
      <p className="panel-intro">{m.postcard_intro()}</p>
      <button type="button" className="primary-button wide" onClick={close}>
        {m.postcard_return()}
      </button>
    </Dialog>
  )
}

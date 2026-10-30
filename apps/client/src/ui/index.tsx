import { useProgress } from '@react-three/drei'
import { useStore } from '@tanstack/react-store'
import { useEffect } from 'react'
import { audio } from '../audio'
import { close, interact, nearby, pause, start } from '../core/actions'
import { PLACES } from '../core/places'
import { XRSessionButton, xrStore } from '../platform/xr'
import { type GameState, game, update } from '../state/game'
import { Conversation } from './dialogue'
import { Icon } from './icons'
import { NeighborhoodMap } from './map'
import {
  JournalPanel,
  MapPanel,
  PausePanel,
  RewardPanel,
  TransportPanel,
} from './panels'
import { TouchStick } from './touch'
import './styles.css'
import './panels.css'

function TitleScreen() {
  const { active, progress } = useProgress()
  return (
    <section className="title-screen" aria-label="Welcome to Sài Gòn">
      <div className="title-content">
        <h1>Sài Gòn</h1>
        <p className="title-subtitle">A little journey</p>
        <p className="title-description">
          Meet a neighbor, lend a hand, and let the city surprise you.
        </p>
        <div className="title-actions">
          <button
            type="button"
            className="primary-button title-start"
            disabled={active}
            onClick={start}
          >
            {active
              ? `Opening the neighborhood… ${Math.round(progress)}%`
              : 'Start exploring'}
          </button>
          <XRSessionButton store={xrStore} />
        </div>
        <p className="title-controls desktop-only">
          <span>
            <kbd>W A S D</kbd> move
          </span>
          <span>
            <kbd>Drag</kbd> look
          </span>
          <span>
            <kbd>E</kbd> say hello
          </span>
        </p>
        <p className="title-controls touch-only">
          Use the thumbstick to move. Drag the city to look around.
        </p>
      </div>
    </section>
  )
}

function Objective({ state }: { state: GameState }) {
  const quest = state.quest
  const delivered = state.world.deliveredItems.includes('herbs:linh')
  const hint = quest
    ? delivered
      ? 'Let Cô Hoa know the herbs arrived.'
      : 'Bring the herbs to Chị Linh in the park.'
    : state.completed.length
      ? 'Follow your curiosity. The city is yours.'
      : 'Say hello to Cô Hoa at the market stall.'
  return (
    <button
      type="button"
      className="objective-note"
      aria-label="Open travel journal"
      onClick={() => update({ panel: 'journal' })}
    >
      <span className="objective-rule" />
      <span>
        <span className="eyebrow">
          {quest
            ? 'A neighbor needs a hand'
            : state.completed.length
              ? 'Make another memory'
              : 'Your first little story'}
        </span>
        <strong>
          {quest?.title ??
            (state.completed.length
              ? 'Take the scenic route'
              : 'A warm welcome')}
        </strong>
        <span className="objective-hint">{hint}</span>
      </span>
      <Icon name={quest ? 'leaf' : 'book'} size={22} />
    </button>
  )
}

export function GameUI() {
  const state = useStore(game, (value) => value)
  const target = nearby(state.position)
  useEffect(() => {
    audio.setMuted(state.muted)
    audio.setVolume(state.volume)
  }, [state.muted, state.volume])
  if (state.screen === 'title')
    return (
      <div className="game-ui">
        <TitleScreen />
      </div>
    )
  const clear =
    state.screen === 'playing' && state.panel === 'none' && !state.dialogue
  return (
    <div className="game-ui">
      <header className="game-header">
        <div className="game-identity">
          <span>Sài Gòn</span>
          <small>{PLACES[state.world.locationId].name}</small>
        </div>
        <nav className="header-tools" aria-label="Game controls">
          <span className="wallet">
            <span className="sr-only">Coins</span>
            <Icon name="coin" />
            <b>{state.world.currency}</b>
          </span>
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
      {clear && !state.ride && (
        <>
          <Objective state={state} />
          <button
            type="button"
            className="minimap-button"
            aria-label="Open neighborhood map"
            onClick={() => update({ panel: 'map' })}
          >
            <NeighborhoodMap state={state} />
            <span>
              <Icon name="compass" size={14} />
              Neighborhood<kbd>M</kbd>
            </span>
          </button>
          <div className="touch-only">
            <TouchStick />
            <button
              type="button"
              className="touch-interact"
              aria-label={target?.label ?? 'Interact'}
              disabled={!target}
              onClick={interact}
            >
              <Icon
                name={target?.kind === 'stop' ? 'bus' : 'arrow'}
                size={24}
              />
              <span>{target?.kind === 'stop' ? 'Ride' : 'Talk'}</span>
            </button>
          </div>
          {target && (
            <button
              type="button"
              className="interaction-prompt desktop-only"
              onClick={interact}
            >
              <kbd>E</kbd>
              {target.label}
            </button>
          )}
          <div className="desktop-hint desktop-only">
            <span>
              <kbd>WASD</kbd> stroll
            </span>
            <span>
              <kbd>Drag</kbd> look
            </span>
            <span>
              <kbd>J</kbd> journal
            </span>
          </div>
        </>
      )}
      {state.ride && (
        <div className="ride-banner">
          <Icon name="bus" />
          <div>
            <span className="eyebrow">Watch the city go by</span>
            <strong>On the way to {PLACES[state.ride.to].name}</strong>
            <progress
              aria-label="Ride progress"
              max="1"
              value={state.ride.progress}
            />
          </div>
        </div>
      )}
      {state.toast && (
        <div className="game-toast" role="status">
          <Icon name="check" size={17} />
          {state.toast}
        </div>
      )}
      {state.dialogue && <Conversation state={state} />}
      {state.panel === 'transport' && <TransportPanel state={state} />}
      {state.panel === 'journal' && <JournalPanel state={state} />}
      {state.panel === 'map' && <MapPanel state={state} />}
      {state.panel === 'reward' && <RewardPanel state={state} />}
      {(state.screen === 'paused' || state.panel === 'settings') && (
        <PausePanel state={state} />
      )}
      {state.panel !== 'none' && (
        <button type="button" className="sr-only" onClick={close}>
          Return to city
        </button>
      )}
    </div>
  )
}

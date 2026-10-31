import { useProgress } from '@react-three/drei'
import { useSelector } from '@tanstack/react-store'
import { useEffect } from 'react'
import { audio } from '../audio'
import {
  close,
  interact,
  nearby,
  openRiverPostcard,
  start,
} from '../core/actions'
import { PLACES } from '../core/places'
import { teamObjective } from '../net/party'
import { net } from '../net/status'
import { useXRPresenting, XRSessionButton, xrStore } from '../platform/xr'
import { type GameState, game, update } from '../state/game'
import { Conversation } from './dialogue'
import { GameHeader } from './header'
import { HubScreen } from './hub'
import { Icon } from './icons'
import { NeighborhoodMap } from './map'
import {
  JournalPanel,
  MapPanel,
  MarketPanel,
  PausePanel,
  PostcardPanel,
  TransportPanel,
} from './panels'
import { PartyInviteControls } from './party'
import { EmoteControls, PeoplePanel } from './people'
import { RewardPanel } from './reward'
import { TouchStick } from './touch'
import './styles.css'
import './panels.css'

function TitleScreen() {
  const { active, progress } = useProgress()
  const { guestName, guestStatus, returningGuest } = useSelector(game, (s) => s)
  return (
    <section className="title-screen" aria-label="Welcome to Sài Gòn">
      <div className="title-content">
        <h1>Sài Gòn</h1>
        <p className="title-subtitle">A little journey</p>
        <p className="title-description">
          {returningGuest && guestName
            ? `Welcome back, ${guestName}`
            : 'Meet a neighbor, lend a hand, and let the city surprise you.'}
        </p>
        <div className="title-actions">
          <button
            type="button"
            className="primary-button title-start"
            disabled={active || guestStatus === 'loading'}
            onClick={start}
          >
            {active
              ? `Opening the neighborhood… ${Math.round(progress)}%`
              : guestStatus === 'loading'
                ? 'Finding your journey…'
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
  const network = useSelector(net, (value) => value)
  const team = teamObjective(network.party, network.selfId)
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
          {team
            ? 'A little teamwork'
            : quest
              ? 'A neighbor needs a hand'
              : state.completed.length
                ? 'Make another memory'
                : 'Your first little story'}
        </span>
        <strong>
          {team?.title ??
            quest?.title ??
            (state.completed.length
              ? 'Take the scenic route'
              : 'A warm welcome')}
        </strong>
        <span className="objective-hint">
          {team ? `${team.hint} ${team.progress}` : hint}
        </span>
      </span>
      <Icon name={quest ? 'leaf' : 'book'} size={22} />
    </button>
  )
}

export function GameUI() {
  const state = useSelector(game, (value) => value)
  const target = nearby(state.position)
  const xrPresenting = useXRPresenting()
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
      <GameHeader state={state} />
      {clear && !xrPresenting && (
        <div className="party-invite-toast">
          <PartyInviteControls />
        </div>
      )}
      {clear && !xrPresenting && <EmoteControls />}
      {state.panel === 'people' && !xrPresenting && <PeoplePanel />}
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
          {state.world.locationId === 'market' && (
            <button
              type="button"
              className="interaction-prompt market-prompt"
              onClick={() => update({ panel: 'market' })}
            >
              <Icon name="leaf" size={20} />
              Browse market goods
            </button>
          )}
          {state.world.locationId === 'river' && (
            <button
              type="button"
              className="interaction-prompt postcard-prompt"
              onClick={openRiverPostcard}
            >
              <Icon name="map" size={20} />
              See the river postcard view
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
            <span>
              <kbd>H</kbd> hub
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
      {state.panel === 'market' && <MarketPanel state={state} />}
      {state.panel === 'postcard' && <PostcardPanel />}
      {state.panel === 'journal' && <JournalPanel state={state} />}
      {state.panel === 'map' && <MapPanel state={state} />}
      {state.panel === 'reward' && <RewardPanel state={state} />}
      {(state.screen === 'paused' || state.panel === 'settings') && (
        <PausePanel state={state} />
      )}
      {state.screen === 'hub' && !xrPresenting && <HubScreen state={state} />}
      {state.panel !== 'none' && (
        <button type="button" className="sr-only" onClick={close}>
          Return to city
        </button>
      )}
    </div>
  )
}

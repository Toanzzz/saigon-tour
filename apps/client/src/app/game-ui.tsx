import { useSelector } from '@tanstack/react-store'
import { useEffect } from 'react'
import { Conversation } from '@/features/conversation/conversation'
import { NeighborhoodMap } from '@/features/map/map'
import { RewardPanel } from '@/features/postcard/reward'
import { audio } from '@/shared/audio'
import { game, update } from '@/shared/state/game'
import { Icon } from '@/shared/ui/icons'
import { PLACES } from '@/shared/world/places'
import { useXRPresenting } from '@/shared/xr'
import { HubScreen } from '@/widgets/hub'
import { GameHeader } from '@/widgets/hud/header'
import { Objective } from '@/widgets/hud/objective'
import {
  JournalPanel,
  MapPanel,
  MarketPanel,
  PausePanel,
  PostcardPanel,
  TransportPanel,
} from '@/widgets/hud/panels'
import { PartyInviteControls } from '@/widgets/hud/party'
import { EmoteControls, PeoplePanel } from '@/widgets/hud/people'
import { TouchStick } from '@/widgets/hud/touch'
import { close, interact, nearby, openRiverPostcard } from './actions'
import { TitleScreen } from './title-screen'

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

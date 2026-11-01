import { useSelector } from '@tanstack/react-store'
import { useEffect } from 'react'
import { Conversation } from '@/features/conversation/conversation'
import { NeighborhoodMap } from '@/features/map/map'
import { RewardPanel } from '@/features/postcard/reward'
import { audio } from '@/shared/audio'
import { m } from '@/shared/i18n'
import { game, update } from '@/shared/state/game'
import { Icon } from '@/shared/ui/icons'
import { placeName } from '@/shared/world/places'
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
import { WaitingNotice } from '@/widgets/hud/waiting'
import { WardrobePanel } from '@/widgets/hud/wardrobe'
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
        <WaitingNotice />
      </div>
    )
  const clear =
    state.screen === 'playing' && state.panel === 'none' && !state.dialogue
  return (
    <div className="game-ui">
      <GameHeader state={state} />
      <WaitingNotice />
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
            aria-label={m.hud_open_map()}
            onClick={() => update({ panel: 'map' })}
          >
            <NeighborhoodMap state={state} />
            <span>
              <Icon name="compass" size={14} />
              {m.hud_neighborhood()}
              <kbd>M</kbd>
            </span>
          </button>
          <div className="touch-only">
            <TouchStick />
            <button
              type="button"
              className="touch-interact"
              aria-label={target?.label ?? m.hud_interact()}
              disabled={!target}
              onClick={interact}
            >
              <Icon
                name={target?.kind === 'stop' ? 'bus' : 'arrow'}
                size={24}
              />
              <span>
                {target?.kind === 'stop' ? m.hud_ride() : m.hud_talk()}
              </span>
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
              {m.hud_browse_market()}
            </button>
          )}
          {state.world.locationId === 'river' && (
            <button
              type="button"
              className="interaction-prompt postcard-prompt"
              onClick={openRiverPostcard}
            >
              <Icon name="map" size={20} />
              {m.hud_river_postcard()}
            </button>
          )}
          <div className="desktop-hint desktop-only">
            <span>
              <kbd>WASD</kbd> {m.hud_hint_stroll()}
            </span>
            <span>
              <kbd>{m.controls_drag()}</kbd> {m.controls_look()}
            </span>
            <span>
              <kbd>J</kbd> {m.hud_hint_journal()}
            </span>
            <span>
              <kbd>H</kbd> {m.hud_hint_hub()}
            </span>
          </div>
        </>
      )}
      {state.ride && (
        <div className="ride-banner">
          <Icon name="bus" />
          <div>
            <span className="eyebrow">{m.ride_watch()}</span>
            <strong>
              {m.ride_on_the_way({ place: placeName(state.ride.to) })}
            </strong>
            <progress
              aria-label={m.ride_progress()}
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
      {state.panel === 'wardrobe' && <WardrobePanel />}
      {(state.screen === 'paused' || state.panel === 'settings') && (
        <PausePanel state={state} />
      )}
      {state.screen === 'hub' && !xrPresenting && <HubScreen state={state} />}
      {state.panel !== 'none' && (
        <button type="button" className="sr-only" onClick={close}>
          {m.hud_return_to_city()}
        </button>
      )}
    </div>
  )
}

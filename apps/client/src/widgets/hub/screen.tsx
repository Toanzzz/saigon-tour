import { useEffect, useRef } from 'react'
import { closeHub } from '@/app/actions'
import { m } from '@/shared/i18n'
import type { GameState } from '@/shared/state/game'
import { Icon } from '@/shared/ui/icons'
import { PartyInviteControls } from '@/widgets/hud/party'
import { NeighborCard, StoryCard } from './cards'
import { PlacesCard, RideCard, SoundCard } from './city'
import { HubHero } from './hero'
import { CityPulse } from './pulse'
import { hubView } from './view'

export function HubScreen({ state }: { state: GameState }) {
  const view = hubView(state)
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])
  return (
    <dialog
      ref={ref}
      className="hub-screen"
      aria-labelledby="hub-title"
      // Visibility is driven by the game store; the global key handler owns
      // Escape. Suppress the native cancel so it cannot double-close.
      onCancel={(event) => event.preventDefault()}
    >
      <div className="hub-inner">
        <header className="hub-topbar">
          <span className="hub-brand">
            <strong>Sài Gòn</strong>
            <small>{m.hub_city_hub()}</small>
          </span>
          <span className="wallet">
            <span className="sr-only">{m.header_coins()}</span>
            <Icon name="coin" />
            <b>{view.coins}</b>
          </span>
          <button
            type="button"
            className="icon-button"
            aria-label={m.hub_close()}
            onClick={() => closeHub()}
          >
            <Icon name="close" />
          </button>
        </header>
        <PartyInviteControls />
        <HubHero view={view} />
        <section className="hub-grid" aria-label={m.hub_your_day()}>
          <StoryCard view={view} />
          <NeighborCard view={view} />
          <RideCard view={view} />
          <PlacesCard view={view} />
          <SoundCard view={view} />
          <CityPulse />
        </section>
      </div>
    </dialog>
  )
}

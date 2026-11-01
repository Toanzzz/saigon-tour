import { closeHub } from '@/app/actions'
import { m } from '@/shared/i18n'
import { Icon } from '@/shared/ui/icons'
import type { HubView } from './view'

const base = import.meta.env.BASE_URL
/* Market pin as a percentage of the Chợ Bến Thành diorama image. */
const MARKET_PIN = { x: 45.5, y: 49 }

export function HubHero({ view }: { view: HubView }) {
  const market = view.places.find((place) => place.id === 'market')
  return (
    <section className="hub-hero" aria-labelledby="hub-title">
      <div className="hub-hero-copy">
        <p className="hub-when">
          {m.hub_discovered({ count: view.discovered, total: view.total })}
        </p>
        <h1 id="hub-title">{view.greeting}</h1>
        <p className="hub-lede">{view.lede}</p>
        <div className="hub-actions">
          <button
            type="button"
            className="primary-button"
            onClick={() => closeHub()}
          >
            {m.pause_continue()}
          </button>
          <button
            type="button"
            className="block-button"
            onClick={() => closeHub('map')}
          >
            <Icon name="map" />
            {m.hub_open_map()}
          </button>
        </div>
      </div>
      <figure className="hub-diorama">
        <img
          src={`${base}images/ben-thanh-1800.webp`}
          srcSet={`${base}images/ben-thanh.webp 900w, ${base}images/ben-thanh-1800.webp 1800w`}
          sizes="(max-width: 900px) 100vw, 60vw"
          width="1800"
          height="983"
          alt={m.hub_diorama_alt()}
        />
        <button
          type="button"
          className={market?.here ? 'hub-pin here' : 'hub-pin'}
          style={{ left: `${MARKET_PIN.x}%`, top: `${MARKET_PIN.y}%` }}
          onClick={() => closeHub('map')}
        >
          <span>Chợ Bến Thành</span>
          {market?.here && <small>{m.hub_you_are_here()}</small>}
        </button>
        <figcaption className="sr-only">{m.hub_diorama_caption()}</figcaption>
      </figure>
    </section>
  )
}

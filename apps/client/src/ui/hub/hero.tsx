import { closeHub } from '../../core/actions'
import { Icon } from '../icons'
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
          {view.discovered} of {view.total} places discovered
        </p>
        <h1 id="hub-title">{view.greeting}</h1>
        <p className="hub-lede">{view.lede}</p>
        <div className="hub-actions">
          <button
            type="button"
            className="primary-button"
            onClick={() => closeHub()}
          >
            Continue exploring
          </button>
          <button
            type="button"
            className="block-button"
            onClick={() => closeHub('map')}
          >
            <Icon name="map" />
            Open full map
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
          alt="Toy model of Chợ Bến Thành with its clock tower and the streets around it"
        />
        <button
          type="button"
          className={market?.here ? 'hub-pin here' : 'hub-pin'}
          style={{ left: `${MARKET_PIN.x}%`, top: `${MARKET_PIN.y}%` }}
          onClick={() => closeHub('map')}
        >
          <span>Chợ Bến Thành</span>
          {market?.here && <small>You are here</small>}
        </button>
        <figcaption className="sr-only">
          Chợ Bến Thành diorama. Select the pin to open the full map.
        </figcaption>
      </figure>
    </section>
  )
}

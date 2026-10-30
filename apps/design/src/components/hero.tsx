import { pins } from '../data'
import { Button } from './ui/button'

export function Hero({ onAction }: { onAction: (message: string) => void }) {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <p className="hero-when">Thursday afternoon, 28°</p>
        <h1 id="hero-title">Chào Mai!</h1>
        <p className="hero-lede">
          Cô Hoa packed a basket of fresh herbs. Chị Linh is waiting for them in
          the park.
        </p>
        <div className="hero-actions">
          <Button
            className="primary-button"
            onClick={() => onAction('Back to the market. Cô Hoa waves hello.')}
          >
            Continue exploring
          </Button>
          <Button
            className="block-button"
            onClick={() => onAction('Full map opened.')}
          >
            Open full map
          </Button>
        </div>
      </div>
      <figure className="diorama">
        <img
          src="/ben-thanh.webp"
          srcSet="/ben-thanh-900.webp 900w, /ben-thanh.webp 1800w"
          sizes="(max-width: 900px) 100vw, 64vw"
          width="1800"
          height="983"
          alt="Toy model of Chợ Bến Thành with its clock tower, the roundabout, and buses on the streets around it"
        />
        {pins.map((pin) => (
          <button
            key={pin.id}
            type="button"
            className={pin.here ? 'pin here' : 'pin'}
            style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
            onClick={() => onAction(`${pin.label} selected.`)}
          >
            <span>{pin.label}</span>
            {pin.here && <small>You are here</small>}
          </button>
        ))}
        <figcaption className="sr-only">
          Neighborhood map. Select a place to plan your next stop.
        </figcaption>
      </figure>
    </section>
  )
}

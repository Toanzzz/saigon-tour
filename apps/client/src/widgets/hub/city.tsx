import { closeHub } from '@/app/actions'
import { m } from '@/shared/i18n'
import { game, update } from '@/shared/state/game'
import { Icon } from '@/shared/ui/icons'
import { distance, PLACES } from '@/shared/world/places'
import type { HubView } from './view'

export function RideCard({ view }: { view: HubView }) {
  const ride = view.ride
  const atStop =
    ride && distance(game.state.position, PLACES[ride.from].stop) < 4
  return (
    <section className="hub-card ride-card">
      <div className="card-header">
        <div>
          <p className="card-kicker">{m.hub_best_ride()}</p>
          <h2 className="card-title">{ride ? ride.name : m.hub_walk_on()}</h2>
        </div>
        <span className="tile-icon bus-red" aria-hidden="true">
          <Icon name="bus" size={22} />
        </span>
      </div>
      {ride ? (
        <>
          <p className="ticket-route">
            <span>{PLACES[ride.from].label}</span>
            <i aria-hidden="true" />
            <span>{PLACES[ride.to].label}</span>
          </p>
          <p className="ticket-fare">
            {m.hub_fare_from_wallet({ coins: m.coins({ count: ride.fare }) })}
          </p>
          <button
            type="button"
            className="block-button wide"
            onClick={() => {
              if (atStop) {
                closeHub()
                update({ panel: 'transport', stop: ride.from })
              } else closeHub('map')
            }}
          >
            {atStop ? m.hud_choose_ride() : m.hub_find_stop()}
          </button>
        </>
      ) : (
        <p className="ticket-fare">{m.hub_no_fare()}</p>
      )}
    </section>
  )
}

export function PlacesCard({ view }: { view: HubView }) {
  const percent = Math.round((view.discovered / view.total) * 100)
  return (
    <section className="hub-card places-card">
      <div className="card-header">
        <div>
          <p className="card-kicker">{m.hub_places_discovered()}</p>
          <h2 className="card-title">
            {m.hub_count_of({ count: view.discovered, total: view.total })}
          </h2>
        </div>
        <span className="tile-icon leaf" aria-hidden="true">
          <Icon name="compass" size={22} />
        </span>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-label={m.hub_places_discovered()}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span style={{ width: `${percent}%` }} />
      </div>
      <ul className="place-chips">
        {view.places.map((place) => (
          <li
            key={place.id}
            className={place.visited ? 'chip visited' : 'chip'}
          >
            {place.visited && <Icon name="check" size={13} />}
            {place.label}
            <span className="sr-only">
              {place.visited ? m.hub_visited() : m.hub_not_visited()}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function SoundCard({ view }: { view: HubView }) {
  const playing = !view.muted
  return (
    <section
      className={
        playing ? 'hub-card sound-card playing' : 'hub-card sound-card'
      }
    >
      <div className="card-header">
        <div>
          <p className="card-kicker">{m.pause_city_sounds()}</p>
          <h2 className="card-title">
            {playing ? m.hub_playing() : m.hub_muted()}
          </h2>
        </div>
        <button
          type="button"
          className="sound-button"
          aria-label={playing ? m.hub_mute_sounds() : m.hub_play_sounds()}
          onClick={() => update({ muted: playing })}
        >
          <Icon name={playing ? 'pause' : 'play'} size={18} />
        </button>
      </div>
      <label className="sound-volume">
        <span>{m.hub_volume({ percent: Math.round(view.volume * 100) })}</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={view.volume}
          onChange={(event) => update({ volume: Number(event.target.value) })}
        />
      </label>
      <span className="sound-wave" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
      </span>
    </section>
  )
}

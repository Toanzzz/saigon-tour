import { closeHub } from '@/app/actions'
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
          <p className="card-kicker">Best value ride</p>
          <h2 className="card-title">{ride ? ride.name : 'Walk on'}</h2>
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
          <p className="ticket-fare">{ride.fare} coins from your wallet</p>
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
            {atStop ? 'Choose a ride' : 'Find the stop'}
          </button>
        </>
      ) : (
        <p className="ticket-fare">
          No fare fits your wallet. Walking is always free.
        </p>
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
          <p className="card-kicker">Places discovered</p>
          <h2 className="card-title">
            {view.discovered} of {view.total}
          </h2>
        </div>
        <span className="tile-icon leaf" aria-hidden="true">
          <Icon name="compass" size={22} />
        </span>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-label="Places discovered"
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
              {place.visited ? ', visited' : ', not visited yet'}
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
          <p className="card-kicker">City sounds</p>
          <h2 className="card-title">{playing ? 'Playing' : 'Muted'}</h2>
        </div>
        <button
          type="button"
          className="sound-button"
          aria-label={playing ? 'Mute city sounds' : 'Play city sounds'}
          onClick={() => update({ muted: playing })}
        >
          <Icon name={playing ? 'pause' : 'play'} size={18} />
        </button>
      </div>
      <label className="sound-volume">
        <span>Volume {Math.round(view.volume * 100)}%</span>
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

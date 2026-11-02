import { useSelector } from '@tanstack/react-store'
import { city } from '@/shared/api/city'
import { m } from '@/shared/i18n'
import { placeName } from '@/shared/world/places'

export function CityPulse() {
  const snapshot = useSelector(city, (state) => state)
  return (
    <section className="hub-card pulse-card" aria-label={m.hub_pulse()}>
      <div className="card-header">
        <div>
          <p className="card-kicker">{m.hub_shared()}</p>
          <h2 className="card-title">{m.hub_pulse()}</h2>
        </div>
      </div>
      <p>{snapshot.weather === 'rain' ? m.hub_rain() : m.hub_clear()}</p>
      {snapshot.events.map((event) => (
        <p key={event.id}>
          <strong>{event.title}</strong> · {placeName(event.locationId)}
        </p>
      ))}
      <ul>
        {snapshot.headlines
          .slice(-5)
          .reverse()
          .map((headline) => (
            <li key={headline.id}>{headline.text}</li>
          ))}
      </ul>
      {!snapshot.headlines.length && <p>{m.hub_settling()}</p>}
    </section>
  )
}

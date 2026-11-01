import { useSelector } from '@tanstack/react-store'
import { city } from '@/shared/api/city'
import { placeName } from '@/shared/world/places'

export function CityPulse() {
  const snapshot = useSelector(city, (state) => state)
  return (
    <section className="hub-card" aria-label="City pulse">
      <div className="card-header">
        <div>
          <p className="card-kicker">Shared neighborhood</p>
          <h2 className="card-title">City pulse</h2>
        </div>
      </div>
      <p>
        {snapshot.weather === 'rain'
          ? 'Rain is passing through the city.'
          : 'Clear skies over Sài Gòn.'}
      </p>
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
      {!snapshot.headlines.length && (
        <p>
          The neighborhood is settling into its day. Meet a neighbor to hear
          more.
        </p>
      )}
    </section>
  )
}

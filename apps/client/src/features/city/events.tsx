import { Html } from '@react-three/drei'
import { useSelector } from '@tanstack/react-store'
import { city } from '@/shared/api/city'
import { PLACES } from '@/shared/world/places'

export function CityEvents() {
  const events = useSelector(city, (state) => state.events)
  return (
    <>
      {events.map((event) => (
        <group key={event.id} position={PLACES[event.locationId].at}>
          <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[2.8, 3.1, 32]} />
            <meshBasicMaterial color="#ffd84d" transparent opacity={0.8} />
          </mesh>
          <Html
            center
            position={[0, 4, 0]}
            distanceFactor={24}
            zIndexRange={[5, 0]}
            style={{ pointerEvents: 'none' }}
          >
            <span className="name-tag event-tag">{event.title}</span>
          </Html>
        </group>
      ))}
    </>
  )
}

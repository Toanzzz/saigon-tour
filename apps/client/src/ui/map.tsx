import { NPCS, type NpcId } from '@saigon/shared'
import { PEOPLE, PLACES } from '../core/places'
import type { GameState } from '../state/game'

const x = (value: number) => (value + 48) * 2
const z = (value: number) => (value + 40) * 2
export function NeighborhoodMap({
  state,
  large = false,
}: {
  state: GameState
  large?: boolean
}) {
  return (
    <svg
      className={large ? 'neighborhood-map large' : 'neighborhood-map'}
      viewBox="0 0 192 160"
      role="img"
      aria-label={`Neighborhood map. You are near ${PLACES[state.world.locationId].name}.`}
    >
      <title>Sài Gòn neighborhood map</title>
      <rect x="0" y="0" width="192" height="160" fill="#d3d7e6" />
      <path d="M183 0v160" stroke="#9dc3e7" strokeWidth="17" />
      <path
        d="M112 4v152M8 104h168M10 42h166"
        stroke="#3d3f4c"
        strokeWidth="9"
      />
      <path
        d="M112 4v152M8 104h168M10 42h166"
        stroke="#fff6d6"
        strokeWidth="1"
        strokeDasharray="3 4"
      />
      <rect
        x="21"
        y="49"
        width="51"
        height="39"
        rx="2"
        fill="#f6e5aa"
        stroke="#262835"
        strokeWidth="1.2"
      />
      <path
        d="m21 49 25-13 26 13z"
        fill="#ee7448"
        stroke="#262835"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <rect
        x="127"
        y="54"
        width="39"
        height="31"
        rx="9"
        fill="#47b08c"
        stroke="#262835"
        strokeWidth="1.2"
      />
      <path
        d="M138 17h18v19h-18zm-4 5h26v6h-26"
        fill="#f6e5aa"
        stroke="#262835"
        strokeWidth="1"
      />
      {Object.entries(PLACES).map(([id, place]) => (
        <g
          key={id}
          transform={`translate(${x(place.stop[0])} ${z(place.stop[2])})`}
        >
          <circle r="3.4" fill="#ee7448" stroke="#262835" strokeWidth="1.5" />
          {large && (
            <text
              y="12"
              textAnchor="middle"
              fill="#262835"
              fontSize="5.7"
              fontWeight="600"
            >
              {place.label}
            </text>
          )}
        </g>
      ))}
      {large &&
        Object.entries(PEOPLE).map(([id, person]) => (
          <g
            key={id}
            transform={`translate(${x(person.at[0])} ${z(person.at[2])})`}
          >
            <circle r="2.6" fill={person.color} />
            <text
              y="-6"
              textAnchor="middle"
              fill="#262835"
              fontSize="6"
              fontWeight="600"
            >
              {NPCS[id as NpcId].name}
            </text>
          </g>
        ))}
      <circle
        cx={x(state.position[0])}
        cy={z(state.position[2])}
        r="5.5"
        fill="#ffd84d"
        fillOpacity=".5"
      />
      <circle
        cx={x(state.position[0])}
        cy={z(state.position[2])}
        r="3"
        fill="#fff6d6"
        stroke="#262835"
        strokeWidth="1.2"
      />
      <text x="10" y="15" fill="#262835" fontSize="8" fontWeight="700">
        N ↑
      </text>
    </svg>
  )
}

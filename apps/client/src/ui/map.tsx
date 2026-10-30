import { NPCS, type NpcId } from '@saigon/shared'
import { type ReactNode, useLayoutEffect, useRef, useState } from 'react'
import { PEOPLE, PLACES } from '../core/places'
import type { GameState } from '../state/game'
import {
  BOUNDS,
  GROUND,
  LANDMARKS,
  MARKET,
  NORTH_ANGLE,
  PARK,
  PLAZAS,
  type Rect,
  ROADS,
  WATER,
} from '../world/district'

/* Text on a translucent pill so labels stay legible over roads and blocks. */
function MapLabel({
  x = 0,
  y,
  size,
  anchor = 'middle',
  children,
}: {
  x?: number
  y: number
  size: number
  anchor?: 'start' | 'middle'
  children: ReactNode
}) {
  const ref = useRef<SVGTextElement>(null)
  const [box, setBox] = useState<DOMRect | null>(null)
  useLayoutEffect(() => {
    const measure = () => {
      const next = ref.current?.getBBox?.()
      if (next) setBox(next)
    }
    measure()
    void document.fonts?.ready.then(measure)
  }, [])
  const padX = size * 0.45
  const padY = size * 0.12
  return (
    <g>
      {box && (
        <rect
          x={box.x - padX}
          y={box.y - padY}
          width={box.width + padX * 2}
          height={box.height + padY * 2}
          rx={(box.height + padY * 2) / 2}
          fill="#fff6d6"
          fillOpacity=".82"
        />
      )}
      <text
        ref={ref}
        x={x}
        y={y}
        textAnchor={anchor}
        fill="#262835"
        fontSize={size}
        fontWeight="700"
      >
        {children}
      </text>
    </g>
  )
}

// World x −52…108 and z −116…44 map onto a 160 × 160 viewBox.
const x = (value: number) => value - BOUNDS.minX
const z = (value: number) => value - BOUNDS.minZ
const rect = (r: Rect, fill: string, key?: string) => (
  <rect
    key={key ?? `${r.x}/${r.z}`}
    x={x(r.x - r.w / 2)}
    y={z(r.z - r.d / 2)}
    width={r.w}
    height={r.d}
    fill={fill}
  />
)
export function NeighborhoodMap({
  state,
  large = false,
}: {
  state: GameState
  large?: boolean
}) {
  const { cityhall, cathedral } = LANDMARKS
  return (
    <svg
      className={large ? 'neighborhood-map large' : 'neighborhood-map'}
      viewBox="0 0 160 160"
      role="img"
      aria-label={`Neighborhood map. You are near ${PLACES[state.world.locationId].name}.`}
    >
      <title>Sài Gòn neighborhood map</title>
      <rect width="160" height="160" fill="#b1b8cb" />
      {GROUND.map((r) => rect(r, '#d3d7e6'))}
      {rect(WATER, '#9dc3e7')}
      {rect(PARK, '#47b08c')}
      {ROADS.map((r) => rect(r, '#3d3f4c'))}
      {PLAZAS.map((r) => rect(r, '#f6e5aa'))}
      {rect(MARKET, '#ee7448', 'market')}
      {rect(cityhall.footprint, '#ffd84d', 'cityhall')}
      {rect(cathedral.footprint, '#c2532f', 'cathedral')}
      {[MARKET, cityhall.footprint, cathedral.footprint].map((r) => (
        <rect
          key={`edge-${r.x}`}
          x={x(r.x - r.w / 2)}
          y={z(r.z - r.d / 2)}
          width={r.w}
          height={r.d}
          rx="1.5"
          fill="none"
          stroke="#262835"
          strokeWidth="1"
        />
      ))}
      {Object.entries(PLACES).map(([id, place]) => (
        <g
          key={id}
          transform={`translate(${x(place.stop[0])} ${z(place.stop[2])})`}
        >
          <circle r="3.4" fill="#ee7448" stroke="#262835" strokeWidth="1.5" />
          {large && (
            <MapLabel y={place.stop[2] > 20 ? -7 : 11} size={5}>
              {place.label}
            </MapLabel>
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
            <MapLabel y={-6} size={6}>
              {NPCS[id as NpcId].name}
            </MapLabel>
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
      <g transform={`translate(148 12) rotate(${NORTH_ANGLE})`}>
        <circle r="8" fill="#fff6d6" fillOpacity=".9" stroke="#262835" />
        <path d="M0 -6 3 2H-3Z" fill="#c2532f" />
        <text y="6.2" textAnchor="middle" fontSize="4.6" fontWeight="800">
          N
        </text>
      </g>
    </svg>
  )
}

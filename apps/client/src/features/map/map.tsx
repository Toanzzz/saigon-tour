import { NPCS, type NpcId } from '@saigon/shared'
import { useSelector } from '@tanstack/react-store'
import { shallow } from '@tanstack/store'
import { type ReactNode, useLayoutEffect, useRef, useState } from 'react'
import { city, npcPosition } from '@/shared/api/city'
import { m, npcLabel, placeSign } from '@/shared/i18n'
import { type GameState, game } from '@/shared/state/game'
import {
  BOUNDS,
  CULTURAL_FOOTPRINTS,
  GROUND,
  LANDMARKS,
  MARKET,
  NORTH_ANGLE,
  PARK,
  PLAZAS,
  type Rect,
  ROADS,
  WATER,
} from '@/shared/world/district'
import { PEOPLE, PLACES, placeName } from '@/shared/world/places'
import { questPin } from './targets'

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
  anchor?: 'start' | 'middle' | 'end'
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

// World x −52…124 and z −116…44 map onto a 176 × 160 viewBox.
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
  useSelector(city, (snapshot) => snapshot.revision)
  // Own `position` subscription so the "you" marker keeps moving even when the
  // parent HUD skips re-rendering on position-only changes (app/game-ui.tsx).
  const position = useSelector(game, (s) => s.position, { compare: shallow })
  const { cityhall, cathedral } = LANDMARKS
  return (
    <svg
      className={large ? 'neighborhood-map large' : 'neighborhood-map'}
      viewBox="0 0 176 160"
      role="img"
      aria-label={m.map_aria({ place: placeName(state.world.locationId) })}
    >
      <title>{m.map_svg_title()}</title>
      <rect width="176" height="160" fill="#b1b8cb" />
      {GROUND.map((r) => rect(r, '#d3d7e6'))}
      {rect(WATER, '#9dc3e7')}
      {rect(PARK, '#47b08c')}
      {ROADS.map((r) => rect(r, '#3d3f4c'))}
      {PLAZAS.map((r) => rect(r, '#f6e5aa'))}
      {rect(MARKET, '#ee7448', 'market')}
      {rect(cityhall.footprint, '#ffd84d', 'cityhall')}
      {rect(cathedral.footprint, '#c2532f', 'cathedral')}
      {rect(CULTURAL_FOOTPRINTS.opera, '#b76a45', 'opera')}
      {rect(CULTURAL_FOOTPRINTS.postoffice, '#d6ad55', 'postoffice')}
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
      {[CULTURAL_FOOTPRINTS.opera, CULTURAL_FOOTPRINTS.postoffice].map((r) => (
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
            <MapLabel
              x={place.stop[0] > 85 ? -4 : 0}
              y={id === 'alley' ? 12 : place.stop[2] > 20 ? -7 : 10}
              size={4}
              anchor={place.stop[0] > 85 ? 'end' : 'middle'}
            >
              {placeSign(id as keyof typeof PLACES)}
            </MapLabel>
          )}
        </g>
      ))}
      {large &&
        Object.entries(PEOPLE).map(([id, person]) => (
          <g
            key={id}
            transform={`translate(${x(npcPosition(id as NpcId)[0])} ${z(npcPosition(id as NpcId)[2])})`}
          >
            <circle
              r={NPCS[id as NpcId].kind === 'resident' ? 1.5 : 2.6}
              fill={person.color}
            />
            <title>{npcLabel(id as NpcId)}</title>
          </g>
        ))}
      {state.quests.map((quest) => {
        const target = questPin(quest)
        return (
          <g
            key={quest.id}
            transform={`translate(${x(target[0])} ${z(target[2])})`}
          >
            <title>{m.map_errand_target({ title: quest.title })}</title>
            <path
              d="M0 -6 4 0 0 6 -4 0Z"
              fill={state.trackedQuestId === quest.id ? '#ffd84d' : '#fff6d6'}
              stroke="#262835"
              strokeWidth="1.2"
            />
          </g>
        )
      })}
      <circle
        cx={x(position[0])}
        cy={z(position[2])}
        r="5.5"
        fill="#ffd84d"
        fillOpacity=".5"
      />
      <circle
        cx={x(position[0])}
        cy={z(position[2])}
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

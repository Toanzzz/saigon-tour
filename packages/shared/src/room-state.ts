import { type MapSchema, schema, t } from '@colyseus/schema'
import { z } from 'zod'
import type { CitySnapshot } from './city/schema'
import type { PresencePlayer } from './multiplayer'
import {
  type AvatarBody,
  AvatarBodySchema,
  type Look,
  LookSchema,
} from './unlocks'

/** Room name registered with the Colyseus matchmaker. */
export const WORLD_ROOM = 'world'

/** `GET /realtime/status`: capacity and the longest-present player. */
export const RoomStatusSchema = z.object({
  capacity: z.number().int().nonnegative(),
  players: z.number().int().nonnegative(),
  full: z.boolean(),
  longest: z
    .object({ name: z.string(), stayedMs: z.number().nonnegative() })
    .nullable(),
})
export type RoomStatus = z.infer<typeof RoomStatusSchema>

/** One connected tourist, synced to every client in the street room. */
export const PresenceState = schema(
  {
    id: t.string(),
    name: t.string(),
    body: t.string(),
    color: t.string(),
    x: t.float32(),
    y: t.float32(),
    z: t.float32(),
    heading: t.float32(),
    ride: t.string().optional(),
    look: t.string().optional(),
  },
  'PresenceState'
)
export type PresenceState = InstanceType<typeof PresenceState>

export const CityNpcState = schema(
  {
    locationId: t.string(),
    anchorId: t.string(),
    x: t.float32(),
    y: t.float32(),
    z: t.float32(),
  },
  'CityNpcState'
)
export type CityNpcState = InstanceType<typeof CityNpcState>
export const CityEventState = schema(
  {
    id: t.string(),
    kind: t.string(),
    locationId: t.string(),
    title: t.string(),
    description: t.string(),
    startedAt: t.float64(),
    endsAt: t.float64(),
  },
  'CityEventState'
)
export const CityHeadlineState = schema(
  {
    id: t.string(),
    text: t.string(),
    createdAt: t.float64(),
  },
  'CityHeadlineState'
)

export const NpcActivityState = schema(
  {
    activityId: t.string(),
    startedAt: t.float64(),
    endsAt: t.float64(),
  },
  'NpcActivityState'
)

/** Colyseus room state: the street name and its connected players. */
export const WorldRoomState = schema(
  {
    street: t.string(),
    players: t.map(PresenceState),
    cityRevision: t.uint32().default(0),
    weather: t.string().default('clear'),
    npcPlacements: t.map(CityNpcState),
    events: t.map(CityEventState),
    needs: t.map('string'),
    npcActivities: t.map(NpcActivityState),
    headlines: t.map(CityHeadlineState),
  },
  'WorldRoomState'
)
export type WorldRoomState = InstanceType<typeof WorldRoomState>

/** Presence bodies fall back to `man` for older clients and empty strings. */
function parseBody(raw: string | undefined): AvatarBody {
  return AvatarBodySchema.parse(raw || undefined)
}

function decodeLook(raw: string | undefined): Look | null {
  if (!raw) return null
  try {
    const parsed = LookSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export function toPresence(state: PresenceState): PresencePlayer {
  return {
    id: state.id,
    name: state.name,
    body: parseBody(state.body),
    color: state.color,
    position: [state.x, state.y, state.z],
    heading: state.heading,
    ride: state.ride ?? null,
    look: decodeLook(state.look),
  }
}

/** Mirror city changes into schema fields so Colyseus sends incremental patches. */
export function syncCity(state: WorldRoomState, city: CitySnapshot) {
  state.cityRevision = city.revision
  state.weather = city.weather
  const npcIds = new Set(Object.keys(city.npcPlacements))
  for (const id of [...state.npcPlacements.keys()])
    if (!npcIds.has(id)) state.npcPlacements.delete(id)
  for (const [id, placement] of Object.entries(city.npcPlacements)) {
    const entry = state.npcPlacements.get(id) ?? new CityNpcState()
    entry.locationId = placement.locationId
    entry.anchorId = placement.anchorId
    ;[entry.x, entry.y, entry.z] = placement.position
    if (!state.npcPlacements.has(id)) state.npcPlacements.set(id, entry)
  }
  const eventIds = new Set(city.events.map((event) => event.id))
  for (const id of [...state.events.keys()])
    if (!eventIds.has(id)) state.events.delete(id)
  for (const event of city.events) {
    const entry = state.events.get(event.id) ?? new CityEventState()
    Object.assign(entry, event)
    if (!state.events.has(event.id)) state.events.set(event.id, entry)
  }
  for (const npcId of [...state.needs.keys()])
    if (!(npcId in city.needs)) state.needs.delete(npcId)
  for (const [npcId, need] of Object.entries(city.needs))
    if (need !== undefined) state.needs.set(npcId, need)
  for (const npcId of [...state.npcActivities.keys()])
    if (!(npcId in city.npcActivities)) state.npcActivities.delete(npcId)
  for (const [npcId, activity] of Object.entries(city.npcActivities)) {
    if (!activity) continue
    const entry = state.npcActivities.get(npcId) ?? new NpcActivityState()
    Object.assign(entry, activity)
    if (!state.npcActivities.has(npcId)) state.npcActivities.set(npcId, entry)
  }
  const headlineIds = new Set(city.headlines.map((headline) => headline.id))
  for (const id of [...state.headlines.keys()])
    if (!headlineIds.has(id)) state.headlines.delete(id)
  for (const headline of city.headlines) {
    const entry = state.headlines.get(headline.id) ?? new CityHeadlineState()
    Object.assign(entry, headline)
    if (!state.headlines.has(headline.id))
      state.headlines.set(headline.id, entry)
  }
}

export function cityFromRoomState(state: WorldRoomState): CitySnapshot {
  const npcPlacements = {} as CitySnapshot['npcPlacements']
  for (const [id, entry] of state.npcPlacements)
    npcPlacements[id as keyof typeof npcPlacements] = {
      locationId:
        entry.locationId as CitySnapshot['npcPlacements']['hoa']['locationId'],
      anchorId: entry.anchorId,
      position: [entry.x, entry.y, entry.z],
    }
  return {
    revision: state.cityRevision,
    weather: state.weather as CitySnapshot['weather'],
    npcPlacements,
    events: [...state.events.values()].map((entry) => ({
      id: entry.id,
      kind: entry.kind as CitySnapshot['events'][number]['kind'],
      locationId:
        entry.locationId as CitySnapshot['events'][number]['locationId'],
      title: entry.title,
      description: entry.description,
      startedAt: entry.startedAt,
      endsAt: entry.endsAt,
    })),
    needs: Object.fromEntries(state.needs),
    npcActivities: Object.fromEntries(
      [...state.npcActivities].map(([id, entry]) => [
        id,
        {
          activityId: entry.activityId,
          startedAt: entry.startedAt,
          endsAt: entry.endsAt,
        },
      ])
    ),
    headlines: [...state.headlines.values()].map((entry) => ({
      id: entry.id,
      text: entry.text,
      createdAt: entry.createdAt,
    })),
  }
}

/** Mirror the authoritative presence list into the synced map. */
export function syncPresence(
  players: MapSchema<PresenceState>,
  list: PresencePlayer[]
) {
  const ids = new Set(list.map((player) => player.id))
  for (const id of [...players.keys()]) if (!ids.has(id)) players.delete(id)
  for (const player of list) {
    const entry = players.get(player.id) ?? new PresenceState()
    entry.id = player.id
    entry.name = player.name
    entry.body = player.body
    entry.color = player.color
    entry.x = player.position[0]
    entry.y = player.position[1]
    entry.z = player.position[2]
    entry.heading = player.heading
    entry.ride = player.ride ?? undefined
    entry.look =
      player.look && Object.keys(player.look).length
        ? JSON.stringify(player.look)
        : undefined
    if (!players.has(player.id)) players.set(player.id, entry)
  }
}

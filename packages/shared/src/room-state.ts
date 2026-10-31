import { type MapSchema, schema, t } from '@colyseus/schema'
import type { PresencePlayer } from './multiplayer'

/** Room name registered with the Colyseus matchmaker. */
export const WORLD_ROOM = 'world'

/** One connected tourist, synced to every client in the street room. */
export const PresenceState = schema(
  {
    id: t.string(),
    name: t.string(),
    color: t.string(),
    x: t.float32(),
    y: t.float32(),
    z: t.float32(),
    heading: t.float32(),
    ride: t.string().optional(),
  },
  'PresenceState'
)
export type PresenceState = InstanceType<typeof PresenceState>

/** Colyseus room state: the street name and its connected players. */
export const WorldRoomState = schema(
  {
    street: t.string(),
    players: t.map(PresenceState),
  },
  'WorldRoomState'
)
export type WorldRoomState = InstanceType<typeof WorldRoomState>

export function toPresence(state: PresenceState): PresencePlayer {
  return {
    id: state.id,
    name: state.name,
    color: state.color,
    position: [state.x, state.y, state.z],
    heading: state.heading,
    ride: state.ride ?? null,
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
    entry.color = player.color
    entry.x = player.position[0]
    entry.y = player.position[1]
    entry.z = player.position[2]
    entry.heading = player.heading
    entry.ride = player.ride ?? undefined
    if (!players.has(player.id)) players.set(player.id, entry)
  }
}

import type { RoomStatus } from '@saigon/shared'
import { ROOM_CAPACITY } from './room-time'
import type { Room } from './room-types'
import type { RoomManager } from './rooms'

/** The single transport-owned world room, if one exists. */
function ownedRoom(manager: RoomManager): Room | undefined {
  for (const room of manager.rooms.values()) if (room.owned) return room
  return undefined
}

/**
 * Whether a player may take a seat in the one world room. A player who already
 * holds a slot (replacement, tab reload, or a retained disconnect) is always
 * admitted; otherwise admission is gated on the room's distinct member count.
 */
export function admit(manager: RoomManager, playerId: string): boolean {
  if (manager.room(playerId)) return true
  const room = ownedRoom(manager)
  return !room || room.members.size < ROOM_CAPACITY
}

/** Capacity and the connected member who has stayed longest. */
export function status(manager: RoomManager, now: () => number): RoomStatus {
  const room = ownedRoom(manager)
  const players = room ? manager.players(room) : []
  let longest: RoomStatus['longest'] = null
  if (room) {
    let earliest: { name: string; joinedAt: number } | null = null
    for (const player of players) {
      const member = room.members.get(player.id)
      if (!member) continue
      if (!earliest || member.joinedAt < earliest.joinedAt)
        earliest = { name: player.name, joinedAt: member.joinedAt }
    }
    if (earliest)
      longest = { name: earliest.name, stayedMs: now() - earliest.joinedAt }
  }
  return {
    capacity: ROOM_CAPACITY,
    players: room ? room.members.size : 0,
    full: room ? room.members.size >= ROOM_CAPACITY : false,
    longest,
  }
}

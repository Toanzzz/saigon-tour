import type { PresencePlayer, ServerSocketMessage } from '@saigon/shared'

/** The subset of a realtime room member that the party service reads. */
export interface PartyRoomMember {
  player: PresencePlayer
  socket: unknown
  acknowledgedSequence: number
}
/** A realtime room as seen by the party service: identity plus its members. */
export interface PartyRoom {
  members: Map<string, PartyRoomMember>
}
/**
 * The structural slice of the realtime room manager that the party service
 * depends on. Decouples party from the concrete RoomManager implementation.
 */
export interface PartyRooms {
  getPlayer(playerId: string): PresencePlayer | undefined
  send(playerId: string, message: ServerSocketMessage): void
  room(playerId: string): PartyRoom | undefined
  onTick(hook: (now: number) => void): () => void
  onLeave(hook: (playerId: string) => void): () => void
}

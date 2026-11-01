import type {
  CitySnapshot,
  NpcId,
  PresencePlayer,
  ServerSocketMessage,
  TimeOfDay,
} from '@saigon/shared'
import type { CityWorld } from '@/domain/city'
import type { CityDirector } from '@/features/director'
import type { NpcScheduler } from './scheduler'

/** The structural slice of the NPC harness the room manager depends on. */
export interface NpcBarker {
  bark(npcId: NpcId, bucket: TimeOfDay): Promise<{ reply: string }>
}
/** A connected client, independent of the transport that carries it. */
export interface RoomSocket {
  send(message: ServerSocketMessage): void
  close(code?: number, reason?: string): void
}
export interface RoomMember {
  player: PresencePlayer
  socket: RoomSocket | null
  /** When the member first joined; preserved across replacement and reconnect. */
  joinedAt: number
  disconnectedAt: number | null
  acknowledgedSequence: number
  eventQueue: Promise<unknown>
}
export interface Room {
  id: string
  members: Map<string, RoomMember>
  city: CityWorld
  director?: CityDirector
  scheduler: NpcScheduler
  emptySince: number | null
  ticking: boolean
  /** Transport hook: publish the connected players (Colyseus state sync). */
  sync?: (players: PresencePlayer[], city: CitySnapshot) => void
  /** Rooms owned by a transport are disposed by it, not by the manager. */
  owned: boolean
}

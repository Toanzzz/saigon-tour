import {
  type GuestPlayer,
  NPC_POSITIONS,
  type NpcId,
  type PlayerEvent,
  type PresencePlayer,
  type ServerSocketMessage,
  type TimeOfDay,
} from '@saigon/shared'
import type { QuestService } from '@/domain/quests'
import type { PlayerSave } from '@/shared/db'
import { NpcScheduler } from './scheduler'

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
  disconnectedAt: number | null
  acknowledgedSequence: number
  eventQueue: Promise<unknown>
}
export interface Room {
  id: string
  members: Map<string, RoomMember>
  scheduler: NpcScheduler
  emptySince: number | null
  ticking: boolean
  /** Transport hook: publish the connected players (Colyseus state sync). */
  sync?: (players: PresencePlayer[]) => void
  /** Rooms owned by a transport are disposed by it, not by the manager. */
  owned: boolean
}
/** Close codes the client distinguishes (4000–4999 are application codes). */
export const CLOSE = {
  replaced: 4002,
  reset: 4003,
  violation: 4008,
} as const
export const ROOM_CAPACITY = 20
const RETAIN_MS = 60_000
const streets = ['Nguyễn Huệ', 'Lê Lợi', 'Đồng Khởi', 'Hàm Nghi', 'Pasteur']
const bucket = (now: number): TimeOfDay => {
  const hour = (new Date(now).getUTCHours() + 7) % 24
  return hour < 6
    ? 'night'
    : hour < 12
      ? 'morning'
      : hour < 18
        ? 'afternoon'
        : 'evening'
}
const near = (player: PresencePlayer, npcId: NpcId) => {
  const position = NPC_POSITIONS[npcId]
  return (
    !player.ride &&
    Math.hypot(
      player.position[0] - position[0],
      player.position[2] - position[2]
    ) <= 10
  )
}

/**
 * Street-room membership, retention, event sequencing, and NPC barks.
 * Transport-agnostic: Colyseus rooms attach members through `join`.
 */
export class RoomManager {
  readonly rooms = new Map<string, Room>()
  private memberships = new Map<string, Room>()
  private counter = 0
  private timer?: ReturnType<typeof setInterval>
  private leaveHooks = new Set<(playerId: string) => void>()
  private tickHooks = new Set<(now: number) => void>()

  constructor(
    private readonly harness: NpcBarker,
    private readonly now = Date.now
  ) {}

  room(playerId: string) {
    return this.memberships.get(playerId)
  }

  getPlayer(playerId: string) {
    return this.room(playerId)?.members.get(playerId)?.player
  }

  onLeave(hook: (playerId: string) => void) {
    this.leaveHooks.add(hook)
    return () => this.leaveHooks.delete(hook)
  }

  onTick(hook: (now: number) => void) {
    this.tickHooks.add(hook)
    return () => this.tickHooks.delete(hook)
  }

  /** A new street room; `owned` rooms are created and disposed by a transport. */
  createRoom(owned = false) {
    const number = this.counter++
    const room: Room = {
      id: `${streets[number % streets.length]} ${Math.floor(number / streets.length) + 1}`,
      members: new Map(),
      emptySince: null,
      ticking: false,
      owned,
      scheduler: new NpcScheduler(async ({ npcId }) => {
        if (!this.players(room).some((player) => near(player, npcId))) return
        const line = await this.harness.bark(npcId, bucket(this.now()))
        if (this.rooms.get(room.id) === room)
          this.broadcast(room, { type: 'npc-line', npcId, reply: line.reply })
      }),
    }
    this.rooms.set(room.id, room)
    return room
  }

  /** Remove a transport-owned room once its transport disposes it. */
  dispose(room: Room) {
    for (const id of room.members.keys()) this.remove(id)
    this.rooms.delete(room.id)
  }

  /** Assign to the player's current room, else any room with space. */
  connect(
    guest: Pick<GuestPlayer, 'id' | 'name' | 'color'>,
    socket: RoomSocket
  ) {
    const room =
      this.room(guest.id) ??
      [...this.rooms.values()].find(
        (item) => !item.owned && item.members.size < ROOM_CAPACITY
      ) ??
      this.createRoom()
    return this.join(room, guest, socket)
  }

  /** Attach a socket to a room, replacing the player's previous socket. */
  join(
    room: Room,
    guest: Pick<GuestPlayer, 'id' | 'name' | 'color'>,
    socket: RoomSocket
  ) {
    const current = this.room(guest.id)
    if (current && current !== room) this.remove(guest.id)
    const existing = room.members.get(guest.id)
    if (existing) {
      const old = existing.socket
      existing.socket = socket
      existing.disconnectedAt = null
      existing.player.name = guest.name
      if (old && old !== socket) old.close(CLOSE.replaced, 'replaced')
    } else {
      room.members.set(guest.id, {
        player: {
          id: guest.id,
          name: guest.name,
          color: guest.color,
          position: [-16, 0, 8],
          heading: 0,
          ride: 'loading',
        },
        socket,
        disconnectedAt: null,
        acknowledgedSequence: 0,
        eventQueue: Promise.resolve(),
      })
      this.memberships.set(guest.id, room)
    }
    room.emptySince = null
    this.send(guest.id, { type: 'welcome', selfId: guest.id, room: room.id })
    room.sync?.(this.players(room))
    return room
  }

  /** Keep the slot for 60 seconds after the socket drops. */
  disconnect(playerId: string, socket?: RoomSocket) {
    const room = this.room(playerId)
    const member = room?.members.get(playerId)
    if (!room || !member?.socket || (socket && member.socket !== socket)) return
    member.socket = null
    member.disconnectedAt = this.now()
    room.sync?.(this.players(room))
    if (!this.players(room).length) room.emptySince = this.now()
  }

  remove(playerId: string, socket?: RoomSocket) {
    const room = this.room(playerId)
    const member = room?.members.get(playerId)
    if (!room || !member) return
    if (socket && member.socket && member.socket !== socket) return
    room.members.delete(playerId)
    this.memberships.delete(playerId)
    if (member.socket !== socket) member.socket?.close(CLOSE.reset, 'reset')
    room.sync?.(this.players(room))
    for (const hook of this.leaveHooks) hook(playerId)
    if (!this.players(room).length) room.emptySince ??= this.now()
  }

  players(room: Room) {
    return [...room.members.values()]
      .filter((m) => m.socket)
      .map((m) => m.player)
  }

  send(playerId: string, message: ServerSocketMessage) {
    const member = this.room(playerId)?.members.get(playerId)
    if (!member?.socket) return
    try {
      member.socket.send(message)
    } catch {
      this.disconnect(playerId, member.socket)
    }
  }

  broadcast(room: Room, message: ServerSocketMessage, except?: string) {
    for (const id of room.members.keys())
      if (id !== except) this.send(id, message)
  }

  processEvents(
    playerId: string,
    sequence: number,
    events: PlayerEvent[],
    game: Pick<QuestService, 'get' | 'applyEvents'>
  ): Promise<PlayerSave> {
    const member = this.room(playerId)?.members.get(playerId)
    if (!member) return Promise.reject(new Error('player_not_in_room'))
    const work = member.eventQueue.then(async () => {
      if (sequence <= member.acknowledgedSequence) return game.get(playerId)
      const record = await game.applyEvents(playerId, events)
      member.acknowledgedSequence = sequence
      return record
    })
    member.eventQueue = work.then(
      () => undefined,
      () => undefined
    )
    return work
  }

  tick(now = this.now()) {
    for (const hook of this.tickHooks) hook(now)
    for (const room of this.rooms.values()) {
      for (const [id, member] of room.members)
        if (
          member.disconnectedAt !== null &&
          now - member.disconnectedAt >= RETAIN_MS
        )
          this.remove(id)
      if (
        !room.owned &&
        room.emptySince !== null &&
        now - room.emptySince >= RETAIN_MS &&
        !room.members.size
      ) {
        this.rooms.delete(room.id)
        continue
      }
      const players = this.players(room)
      if (!players.length) continue
      room.sync?.(players)
      if (room.ticking) continue
      for (const npcId of Object.keys(NPC_POSITIONS) as NpcId[])
        if (players.some((player) => near(player, npcId)))
          room.scheduler.notify(npcId, 'player-nearby')
      room.ticking = true
      void room.scheduler
        .tick(now)
        .catch(() => {
          this.broadcast(room, {
            type: 'error',
            message: 'service_unavailable',
          })
        })
        .finally(() => {
          room.ticking = false
        })
    }
  }

  start() {
    this.timer ??= setInterval(() => this.tick(), 100)
    this.timer.unref?.()
  }

  stop() {
    clearInterval(this.timer)
    this.timer = undefined
  }

  shutdown() {
    this.stop()
    for (const room of this.rooms.values())
      for (const member of room.members.values())
        member.socket?.close(1012, 'server_restart')
    this.rooms.clear()
    this.memberships.clear()
  }
}

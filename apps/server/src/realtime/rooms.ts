import {
  type GuestPlayer,
  NPC_POSITIONS,
  type NpcId,
  type PlayerEvent,
  type PresencePlayer,
  type ServerSocketMessage,
  type TimeOfDay,
} from '@saigon/shared'
import type { PlayerSave } from '../db'
import type { GameService } from '../game/state'
import type { NpcHarness } from '../npc/mastra'
import { NpcScheduler } from '../npc/scheduler'

export interface RoomSocket {
  send(data: string): void
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
}
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

export class RoomManager {
  readonly rooms = new Map<string, Room>()
  private memberships = new Map<string, Room>()
  private counter = 0
  private timer?: ReturnType<typeof setInterval>
  private leaveHooks = new Set<(playerId: string) => void>()

  constructor(
    private readonly harness: Pick<NpcHarness, 'bark'>,
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

  connect(
    guest: Pick<GuestPlayer, 'id' | 'name' | 'color'>,
    socket: RoomSocket
  ) {
    let room = this.room(guest.id)
    const existing = room?.members.get(guest.id)
    if (existing) {
      const old = existing.socket
      existing.socket = socket
      existing.disconnectedAt = null
      old?.close(1000, 'replaced')
    } else {
      room ??= [...this.rooms.values()].find((item) => item.members.size < 20)
      room ??= this.createRoom()
      const player: PresencePlayer = {
        id: guest.id,
        name: guest.name,
        color: guest.color,
        position: [-16, 0, 8],
        heading: 0,
        ride: null,
      }
      room.members.set(guest.id, {
        player,
        socket,
        disconnectedAt: null,
        acknowledgedSequence: 0,
        eventQueue: Promise.resolve(),
      })
      this.memberships.set(guest.id, room)
    }
    if (!room) throw new Error('room_unavailable')
    room.emptySince = null
    const player = room.members.get(guest.id)?.player
    if (!player) throw new Error('player_unavailable')
    this.send(guest.id, {
      type: 'welcome',
      selfId: guest.id,
      room: room.id,
      players: this.players(room),
    })
    if (!existing?.socket || existing.socket === socket)
      this.broadcast(room, { type: 'player-joined', player }, guest.id)
    return room
  }

  disconnect(playerId: string, socket?: RoomSocket) {
    const room = this.room(playerId)
    const member = room?.members.get(playerId)
    if (!room || !member?.socket || (socket && member.socket !== socket)) return
    member.socket = null
    member.disconnectedAt = this.now()
    this.broadcast(room, { type: 'player-left', playerId })
    if (!this.players(room).length) room.emptySince = this.now()
  }

  remove(playerId: string) {
    const room = this.room(playerId)
    const member = room?.members.get(playerId)
    if (!room || !member) return
    room.members.delete(playerId)
    this.memberships.delete(playerId)
    member.socket?.close(1000, 'membership_reset')
    this.broadcast(room, { type: 'player-left', playerId })
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
      member.socket.send(JSON.stringify(message))
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
    game: Pick<GameService, 'get' | 'applyEvents'>
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
    for (const room of this.rooms.values()) {
      for (const [id, member] of room.members)
        if (
          member.disconnectedAt !== null &&
          now - member.disconnectedAt >= 60_000
        )
          this.remove(id)
      if (
        room.emptySince !== null &&
        now - room.emptySince >= 60_000 &&
        !room.members.size
      ) {
        this.rooms.delete(room.id)
        continue
      }
      const players = this.players(room)
      if (!players.length) continue
      this.broadcast(room, { type: 'players', players })
      if (room.ticking) continue
      for (const [npcId, position] of Object.entries(NPC_POSITIONS))
        if (
          players.some(
            (p) =>
              !p.ride &&
              Math.hypot(
                p.position[0] - position[0],
                p.position[2] - position[2]
              ) <= 10
          )
        )
          room.scheduler.notify(npcId as NpcId, 'player-nearby')
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

  private createRoom() {
    const number = this.counter++
    const room: Room = {
      id: `${streets[number % streets.length]} ${Math.floor(number / streets.length) + 1}`,
      members: new Map(),
      emptySince: null,
      ticking: false,
      scheduler: new NpcScheduler(async ({ npcId }) => {
        const position = NPC_POSITIONS[npcId]
        if (
          !this.players(room).some(
            (player) =>
              !player.ride &&
              Math.hypot(
                player.position[0] - position[0],
                player.position[2] - position[2]
              ) <= 10
          )
        )
          return
        const line = await this.harness.bark(npcId, bucket(this.now()))
        if (this.rooms.get(room.id) === room)
          this.broadcast(room, { type: 'npc-line', npcId, reply: line.reply })
      }),
    }
    this.rooms.set(room.id, room)
    return room
  }
}

import {
  type GuestPlayer,
  type NeighborId,
  NPC_POSITIONS,
  type PlayerEvent,
  type ServerSocketMessage,
} from '@saigon/shared'
import { CityWorld } from '@/domain/city'
import type { QuestService } from '@/domain/quests'
import type { CityDirector } from '@/features/director'
import type { PlayerSave } from '@/shared/db'
import {
  CLOSE,
  nearNpc,
  RETAIN_MS,
  ROOM_CAPACITY,
  STREETS,
  timeBucket,
} from './room-time'

export { CLOSE, ROOM_CAPACITY } from './room-time'

import { NpcScheduler } from './scheduler'

export type { NpcBarker, Room, RoomMember, RoomSocket } from './room-types'

import type { NpcBarker, Room, RoomSocket } from './room-types'
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
    private readonly now = Date.now,
    private readonly createDirector?: (city: CityWorld) => CityDirector
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
      id: `${STREETS[number % STREETS.length]} ${Math.floor(number / STREETS.length) + 1}`,
      members: new Map(),
      emptySince: null,
      ticking: false,
      owned,
      city: new CityWorld(
        this.now,
        (headline) => this.broadcast(room, { type: 'city-headline', headline }),
        () => {
          room.sync?.(this.players(room), room.city.snapshot())
          room.director?.notify('world-event')
        }
      ),
      scheduler: new NpcScheduler(async ({ npcId }) => {
        if (!this.players(room).some((player) => nearNpc(player, npcId, room)))
          return
        const line = await this.harness.bark(npcId, timeBucket(this.now()))
        if (this.rooms.get(room.id) === room)
          this.broadcast(room, { type: 'npc-line', npcId, reply: line.reply })
      }),
    }
    room.director = this.createDirector?.(room.city)
    this.rooms.set(room.id, room)
    return room
  }

  /** Remove a transport-owned room once its transport disposes it. */
  dispose(room: Room) {
    for (const id of room.members.keys()) this.remove(id)
    room.director?.dispose()
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
          look: null,
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
    room.sync?.(this.players(room), room.city.snapshot())
    return room
  }

  /** Keep the slot for 60 seconds after the socket drops. */
  disconnect(playerId: string, socket?: RoomSocket) {
    const room = this.room(playerId)
    const member = room?.members.get(playerId)
    if (!room || !member?.socket || (socket && member.socket !== socket)) return
    member.socket = null
    member.disconnectedAt = this.now()
    room.sync?.(this.players(room), room.city.snapshot())
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
    room.sync?.(this.players(room), room.city.snapshot())
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
        room.director?.dispose()
        this.rooms.delete(room.id)
        continue
      }
      const players = this.players(room)
      void room.director?.tick(now, players.length).catch(() => {})
      if (!players.length) continue
      room.sync?.(players, room.city.snapshot())
      if (room.ticking) continue
      for (const npcId of Object.keys(NPC_POSITIONS) as NeighborId[])
        if (players.some((player) => nearNpc(player, npcId, room)))
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
    for (const room of this.rooms.values()) {
      room.director?.dispose()
      for (const member of room.members.values())
        member.socket?.close(1012, 'server_restart')
    }
    this.rooms.clear()
    this.memberships.clear()
  }
}

import {
  type Client,
  CloseCode,
  type AuthContext as ColyseusAuthContext,
  Room,
} from '@colyseus/core'
import {
  ClientSocketMessageSchema,
  type PartyClientMessage,
  type ServerSocketMessage,
  syncPresence,
  WORLD_BOUNDS,
  WorldRoomState,
} from '@saigon/shared'
import type { QuestService } from '@/domain/quests'
import type { Auth } from '@/features/auth'
import type { GameDb } from '@/shared/db'
import {
  CLOSE,
  ROOM_CAPACITY,
  type RoomManager,
  type RoomSocket,
  type Room as StreetRoom,
} from './rooms'

export interface WorldRoomDeps {
  auth: Auth
  db: GameDb
  game: QuestService
  manager: RoomManager
  hooks: {
    onMessage(playerId: string, message: PartyClientMessage): Promise<void>
    onConnected(playerId: string): void
  }
}
interface Identity {
  id: string
  name: string
  color: string
}
interface Limits {
  windowStart: number
  all: number
  state: number
  events: number
  lastEmote: number
}

/** 10 Hz senders jitter; allow headroom so one window can hold 11+ ticks. */
const STATE_PER_SECOND = 15
/** Seconds a dropped client may reconnect into its retained slot. */
const RECONNECT_SECONDS = 60

/**
 * One public street room. Colyseus owns transport, matchmaking, seat
 * reservation, and reconnection; `RoomManager` keeps the game rules.
 */
export class WorldRoom extends Room<{ state: WorldRoomState }> {
  static deps: WorldRoomDeps

  /** Verify the Better Auth bearer session before a seat is reserved. */
  static async onAuth(
    token: string,
    _options: unknown,
    _ctx: ColyseusAuthContext
  ) {
    if (!token) return false
    const session = await WorldRoom.deps.auth.api.getSession({
      headers: new Headers({ Authorization: `Bearer ${token}` }),
    })
    if (!session) return false
    const player = await WorldRoom.deps.db.ensurePlayer(session.user)
    return { id: player.id, name: player.name, color: player.color }
  }

  maxClients = ROOM_CAPACITY
  private street!: StreetRoom
  private sockets = new Map<string, RoomSocket>()
  private limits = new Map<string, Limits>()

  onCreate() {
    const { manager } = WorldRoom.deps
    this.street = manager.createRoom(true)
    this.state = new WorldRoomState()
    this.state.street = this.street.id
    this.street.sync = (players) => syncPresence(this.state.players, players)
    this.onMessage('*', (client, type, payload) =>
      this.receive(client, String(type), payload)
    )
  }

  onJoin(client: Client, _options: unknown, auth: Identity) {
    // One active session per player across rooms: a newer join wins.
    const socket = this.socket(client)
    this.sockets.set(client.sessionId, socket)
    WorldRoom.deps.manager.join(this.street, auth, socket)
    WorldRoom.deps.hooks.onConnected(auth.id)
  }

  async onDrop(client: Client) {
    const auth = client.auth as Identity
    const socket = this.sockets.get(client.sessionId)
    WorldRoom.deps.manager.disconnect(auth.id, socket)
    try {
      const next = await this.allowReconnection(client, RECONNECT_SECONDS)
      const replacement = this.socket(next)
      this.sockets.delete(client.sessionId)
      this.sockets.set(next.sessionId, replacement)
      WorldRoom.deps.manager.join(this.street, auth, replacement)
      WorldRoom.deps.hooks.onConnected(auth.id)
    } catch {
      // The manager's 60-second retention removes the slot.
    }
  }

  onLeave(client: Client) {
    const auth = client.auth as Identity | undefined
    const socket = this.sockets.get(client.sessionId)
    this.sockets.delete(client.sessionId)
    this.limits.delete(client.sessionId)
    if (auth) WorldRoom.deps.manager.remove(auth.id, socket)
  }

  onDispose() {
    WorldRoom.deps.manager.dispose(this.street)
  }

  private socket(client: Client): RoomSocket {
    return {
      send: (message: ServerSocketMessage) =>
        client.send(message.type, message),
      close: (code = CloseCode.CONSENTED, reason) => client.leave(code, reason),
    }
  }

  private limited(client: Client, type: string) {
    const now = Date.now()
    let limits = this.limits.get(client.sessionId)
    if (!limits || now - limits.windowStart >= 1000) {
      limits = {
        windowStart: now,
        all: 0,
        state: 0,
        events: 0,
        lastEmote: limits?.lastEmote ?? -Infinity,
      }
      this.limits.set(client.sessionId, limits)
    }
    if (++limits.all > 40) return true
    if (type === 'state' && ++limits.state > STATE_PER_SECOND) return true
    if (type === 'events' && ++limits.events > 10) return true
    if (type === 'emote') {
      if (now - limits.lastEmote < 1000) return true
      limits.lastEmote = now
    }
    return false
  }

  private receive(client: Client, type: string, payload: unknown) {
    const { manager, game, hooks } = WorldRoom.deps
    const playerId = (client.auth as Identity).id
    const parsed = ClientSocketMessageSchema.safeParse({
      ...(typeof payload === 'object' && payload ? payload : {}),
      type,
    })
    if (!parsed.success) return client.leave(CLOSE.violation, 'invalid_message')
    if (this.limited(client, type))
      return client.leave(CLOSE.violation, 'rate_limit')
    if (
      manager.room(playerId)?.members.get(playerId)?.socket !==
      this.sockets.get(client.sessionId)
    )
      return client.leave(CLOSE.replaced, 'replaced')
    const message = parsed.data
    if (message.type === 'state') {
      const [x, , z] = message.position
      if (
        x < WORLD_BOUNDS.x[0] ||
        x > WORLD_BOUNDS.x[1] ||
        z < WORLD_BOUNDS.z[0] ||
        z > WORLD_BOUNDS.z[1]
      )
        return client.leave(CLOSE.violation, 'out_of_bounds')
      const player = manager.getPlayer(playerId)
      if (player)
        Object.assign(player, {
          position: message.position,
          heading: message.heading,
          ride: message.ride,
        })
    } else if (message.type === 'emote') {
      manager.broadcast(this.street, {
        type: 'emote',
        playerId,
        emote: message.emote,
      })
    } else if (message.type === 'events') {
      void manager
        .processEvents(playerId, message.sequence, message.events, game)
        .then((record) =>
          manager.send(playerId, {
            type: 'world',
            ...record,
            sequence:
              manager.room(playerId)?.members.get(playerId)
                ?.acknowledgedSequence ?? message.sequence,
          })
        )
        .catch(() =>
          manager.send(playerId, {
            type: 'error',
            message: 'service_unavailable',
          })
        )
    } else {
      void hooks.onMessage(playerId, message).catch((error: unknown) =>
        manager.send(playerId, {
          type: 'error',
          message: error instanceof Error ? error.message : 'party_unavailable',
        })
      )
    }
  }
}

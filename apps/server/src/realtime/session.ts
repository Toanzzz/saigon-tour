import {
  type ClientSocketMessage,
  ClientSocketMessageSchema,
  WORLD_BOUNDS,
} from '@saigon/shared'
import type { GameDb } from '../db'
import type { GameService } from '../game/state'
import type { PartyMessage } from '../party'
import type { RoomManager, RoomSocket } from './rooms'

export class SocketSession {
  private playerId?: string
  private closed = false
  private authenticating = false
  private lastEmote = -Infinity
  private windowStart = Date.now()
  private counts = { all: 0, state: 0, events: 0 }
  private deadline: ReturnType<typeof setTimeout>

  constructor(
    private readonly socket: RoomSocket,
    private readonly rooms: RoomManager,
    private readonly db: GameDb,
    private readonly game: GameService,
    private readonly hooks?: {
      onMessage(playerId: string, message: PartyMessage): Promise<void>
      onConnected(playerId: string): void
    }
  ) {
    this.deadline = setTimeout(() => this.close(1008, 'hello_timeout'), 5000)
    this.deadline.unref()
  }

  receive(data: unknown) {
    if (this.closed) return
    if (typeof data !== 'string' || Buffer.byteLength(data) > 4096) {
      this.close(1009, 'message_too_large')
      return
    }
    let message: ClientSocketMessage
    try {
      message = ClientSocketMessageSchema.parse(JSON.parse(data))
    } catch {
      this.close(1008, 'invalid_message')
      return
    }
    const now = Date.now()
    if (now - this.windowStart >= 1000) {
      this.windowStart = now
      this.counts = { all: 0, state: 0, events: 0 }
    }
    if (
      ++this.counts.all > 40 ||
      (message.type === 'state' && ++this.counts.state > 10) ||
      (message.type === 'events' && ++this.counts.events > 10)
    ) {
      this.close(1008, 'rate_limit')
      return
    }
    if (!this.playerId) {
      if (message.type !== 'hello' || this.authenticating) {
        this.close(1008, 'hello_required')
        return
      }
      this.authenticating = true
      void this.hello(message.token)
      return
    }
    if (message.type === 'hello') {
      this.close(1008, 'already_authenticated')
      return
    }
    if (
      this.rooms.room(this.playerId)?.members.get(this.playerId)?.socket !==
      this.socket
    ) {
      this.close(1008, 'replaced')
      return
    }
    if (message.type === 'state') {
      const [x, , z] = message.position
      if (
        x < WORLD_BOUNDS.x[0] ||
        x > WORLD_BOUNDS.x[1] ||
        z < WORLD_BOUNDS.z[0] ||
        z > WORLD_BOUNDS.z[1]
      ) {
        this.close(1008, 'out_of_bounds')
        return
      }
      const player = this.rooms.getPlayer(this.playerId)
      if (player)
        Object.assign(player, {
          position: message.position,
          heading: message.heading,
          ride: message.ride,
        })
    } else if (message.type === 'emote') {
      if (now - this.lastEmote < 1000) {
        this.close(1008, 'rate_limit')
        return
      }
      this.lastEmote = now
      const room = this.rooms.room(this.playerId)
      if (room)
        this.rooms.broadcast(room, {
          type: 'emote',
          playerId: this.playerId,
          emote: message.emote,
        })
    } else if (message.type === 'events') {
      const playerId = this.playerId
      void this.rooms
        .processEvents(playerId, message.sequence, message.events, this.game)
        .then((record) => {
          if (!this.closed)
            this.rooms.send(playerId, {
              type: 'world',
              ...record,
              sequence:
                this.rooms.room(playerId)?.members.get(playerId)
                  ?.acknowledgedSequence ?? message.sequence,
            })
        })
        .catch(() => {
          this.error()
        })
    } else {
      void this.hooks
        ?.onMessage(this.playerId, message)
        .catch((error: unknown) => {
          if (!this.closed)
            this.socket.send(
              JSON.stringify({
                type: 'error',
                message:
                  error instanceof Error ? error.message : 'party_unavailable',
              })
            )
        })
    }
  }

  close(code?: number, reason?: string) {
    if (this.closed) return
    this.closed = true
    clearTimeout(this.deadline)
    if (this.playerId) this.rooms.disconnect(this.playerId, this.socket)
    if (code) this.socket.close(code, reason)
  }

  private async hello(token: string) {
    try {
      const player = await this.db.authenticate(token)
      if (this.closed) return
      if (!player) {
        this.close(1008, 'unauthorized')
        return
      }
      this.playerId = player.id
      clearTimeout(this.deadline)
      this.rooms.connect(player, this.socket)
      this.hooks?.onConnected(player.id)
    } catch {
      this.error()
      this.close(1011, 'service_unavailable')
    }
  }

  private error() {
    if (!this.closed)
      this.socket.send(
        JSON.stringify({
          type: 'error',
          message: 'service_unavailable',
        })
      )
  }
}

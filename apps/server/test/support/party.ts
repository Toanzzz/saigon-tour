import {
  type GuestPlayer,
  type InteractRequest,
  InteractResponseSchema,
  type NpcId,
  type PlayerEvent,
  type ServerSocketMessage,
  ServerSocketMessageSchema,
} from '@saigon/shared'
import { afterAll, afterEach, beforeAll, beforeEach, expect } from 'vitest'
import { createApp } from '@/app'
import type { RoomSocket } from '@/features/realtime'
import { readConfig } from '@/shared'
import { fixture } from '../fixture'

export class Recorder implements RoomSocket {
  messages: ServerSocketMessage[] = []
  closed: number | undefined
  send(message: ServerSocketMessage) {
    this.messages.push(ServerSocketMessageSchema.parse(message))
  }
  close(code?: number) {
    this.closed = code
  }
  clear() {
    this.messages.length = 0
  }
}
export type Guest = {
  player: GuestPlayer
  token: string
  socket: Recorder
}

export function required<T>(value: T | undefined | null): T {
  if (value == null) throw new Error('Missing test entity')
  return value
}

/**
 * Registers the shared party fixture hooks and returns accessors plus helpers
 * bound to the live per-test app. Both party spec files call this.
 */
export function setupParty() {
  let fx: Awaited<ReturnType<typeof fixture>>
  let app: ReturnType<typeof createApp>
  let now: number
  beforeAll(async () => {
    fx = await fixture()
  })
  beforeEach(() => {
    now = Date.parse('2026-10-31T10:00:00Z')
    app = createApp({ ...readConfig({}), production: true }, fetch, {
      ...fx,
      now: () => now,
    })
    app.realtime.manager.stop()
  })
  afterEach(() => app.realtime.manager.shutdown())
  afterAll(() => fx.close())

  const context = {
    get fx() {
      return fx
    },
    get app() {
      return app
    },
    get now() {
      return now
    },
    advance(ms: number) {
      now += ms
    },
    /** Rebuild the shared app with a custom fetcher, e.g. for live model runs. */
    live(
      fetcher: typeof fetch,
      overrides: Partial<ReturnType<typeof readConfig>> = {}
    ) {
      app.realtime.manager.shutdown()
      app = createApp(
        { ...readConfig({}), production: true, ...overrides },
        fetcher,
        { ...fx, now: () => now }
      )
      app.realtime.manager.stop()
      return app
    },
    async guest(): Promise<Guest> {
      const identity = await fx.guest()
      const socket = new Recorder()
      app.realtime.manager.connect(identity.player, socket)
      return { ...identity, socket }
    },
    invite(from: Guest, to: Guest) {
      return app.realtime.party.invite(from.player.id, to.player.id)
    },
    async join(from: Guest, to: Guest) {
      const invitation = await context.invite(from, to)
      return app.realtime.party.respond(to.player.id, invitation.inviteId, true)
    },
    snapshot(player: Guest) {
      return app.realtime.party.snapshot(player.player.id)
    },
    position(player: Guest, x: number) {
      const presence = app.realtime.manager.getPlayer(player.player.id)
      if (!presence) throw new Error('Missing presence')
      presence.position = [x, 0, 8]
    },
    async ask(
      player: Guest,
      npcId: NpcId,
      intent: InteractRequest['intent'] = 'chat',
      events: PlayerEvent[] = []
    ) {
      const response = await app.request(`/npc/${npcId}/interact`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${player.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message:
            intent === 'help' ? 'Can I help with an errand?' : 'Hello again!',
          intent,
          events,
          worldContext: {
            playerLocation: npcId === 'linh' ? 'park' : 'market',
            nearbyNpcs: [npcId],
            timeOfDay: 'morning',
          },
        }),
      })
      expect(response.status).toBe(200)
      return InteractResponseSchema.parse(await response.json())
    },
    async team(size = 2) {
      const leader = await context.guest()
      const members = [leader]
      for (let index = 1; index < size; index++) {
        const member = await context.guest()
        await context.join(leader, member)
        members.push(member)
      }
      return members
    },
  }
  return context
}

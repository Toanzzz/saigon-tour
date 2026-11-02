import { once } from 'node:events'
import type { Server } from 'node:http'
import { Client, type Room } from '@colyseus/sdk'
import { type ServerType, serve } from '@hono/node-server'
import {
  type ClientSocketMessage,
  type PresencePlayer,
  type ServerSocketMessage,
  ServerSocketMessageSchema,
  toPresence,
  WORLD_ROOM,
  type WorldRoomState,
} from '@saigon/shared'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'
import { createApp } from '@/app'
import { readConfig } from '@/shared'
import { fixture } from '../fixture'

export type Message<T extends ServerSocketMessage['type']> = Extract<
  ServerSocketMessage,
  { type: T }
>
export const origin = 'http://localhost:58000'
const peers: Peer[] = []

/** A real Colyseus SDK client joined to the world room. */
export class Peer {
  readonly messages: ServerSocketMessage[] = []
  readonly closed: Promise<{ code: number; reason?: string }>
  private resolveClosed!: (value: { code: number; reason?: string }) => void
  constructor(readonly room: Room<unknown, WorldRoomState>) {
    peers.push(this)
    this.closed = new Promise((resolve) => {
      this.resolveClosed = resolve
    })
    room.reconnection.enabled = false
    room.onLeave((code, reason) => this.resolveClosed({ code, reason }))
    room.onMessage('*', (_type, payload) => {
      const parsed = ServerSocketMessageSchema.safeParse(payload)
      if (parsed.success) this.messages.push(parsed.data)
    })
  }
  get players(): PresencePlayer[] {
    return [...(this.room.state?.players?.values() ?? [])].map(toPresence)
  }
  send({ type, ...payload }: ClientSocketMessage) {
    this.room.send(type, payload)
  }
  /** Raw payload, bypassing the typed contract (for violation tests). */
  sendRaw(type: string, payload: unknown) {
    this.room.send(type, payload)
  }
  drop() {
    return this.room.leave(false)
  }
  async wait<T extends ServerSocketMessage['type']>(
    type: T,
    predicate: (message: Message<T>) => boolean = () => true
  ): Promise<Message<T>> {
    return until(
      () =>
        this.messages.find(
          (message): message is Message<T> =>
            message.type === type && predicate(message as Message<T>)
        ),
      `Missing ${type}`
    )
  }
  waitPlayers(predicate: (players: PresencePlayer[]) => boolean) {
    return until(
      () => (predicate(this.players) ? this.players : undefined),
      'Missing players'
    )
  }
}

export async function until<T>(
  read: () => T | undefined,
  label = 'timeout',
  ms = 3000
) {
  const end = Date.now() + ms
  for (;;) {
    const value = read()
    if (value !== undefined) return value
    if (Date.now() > end) throw new Error(label)
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
}

export function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('Missing test entity')
  return value
}

/** Registers the shared realtime fixture hooks and exposes bound helpers. */
export function setupRealtime() {
  let fx: Awaited<ReturnType<typeof fixture>>
  let app: ReturnType<typeof createApp>
  let server: ServerType
  let url: string

  /** Join with a session token; rejects when matchmaking refuses. */
  async function open(token?: string, from = origin) {
    const client = new Client(url, { headers: { Origin: from } })
    if (token) client.auth.token = token
    return new Peer(await client.joinOrCreate<WorldRoomState>(WORLD_ROOM))
  }
  async function start(apiKey?: string, fetcher: typeof fetch = fetch) {
    app = createApp(
      { ...readConfig({}), apiKey, production: true },
      fetcher,
      fx
    )
    server = serve({ fetch: app.fetch, port: 0, hostname: '127.0.0.1' })
    if (!server.listening) await once(server, 'listening')
    await app.realtime.attach(server as Server)
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('Missing port')
    url = `http://127.0.0.1:${address.port}`
  }
  async function stop() {
    await Promise.allSettled(peers.splice(0).map((peer) => peer.room.leave()))
    await app.realtime.shutdown()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }

  beforeAll(async () => {
    fx = await fixture(undefined, 1)
  })
  beforeEach(async () => {
    await start()
  })
  afterEach(stop)
  afterAll(async () => {
    await fx.close()
  })

  return {
    open,
    start,
    stop,
    get app() {
      return app
    },
    get url() {
      return url
    },
    get fx() {
      return fx
    },
    async guest() {
      const identity = await fx.guest()
      const peer = await open(identity.token)
      const welcome = await peer.wait('welcome')
      return { ...identity, peer, welcome }
    },
    async move(peer: Peer, id: string, position: [number, number, number]) {
      peer.send({ type: 'state', position, heading: 0, ride: null })
      await until(() =>
        JSON.stringify(app.realtime.manager.getPlayer(id)?.position) ===
        JSON.stringify(position)
          ? true
          : undefined
      )
    },
    /** Join with a token and expect matchmaking to reject; returns the error. */
    async expectRejected(token?: string, from = origin) {
      const client = new Client(url, { headers: { Origin: from } })
      if (token) client.auth.token = token
      try {
        const peer = new Peer(
          await client.joinOrCreate<WorldRoomState>(WORLD_ROOM)
        )
        peers.push(peer)
        throw new Error('Expected join to reject')
      } catch (error) {
        return error as { message?: string; code?: number }
      }
    },
    /** `GET /realtime/status` over HTTP with the configured origin. */
    async status(from = origin) {
      const response = await fetch(`${url}/realtime/status`, {
        headers: { Origin: from },
      })
      return (await response.json()) as {
        capacity: number
        players: number
        full: boolean
        longest: { name: string; stayedMs: number } | null
      }
    },
  }
}

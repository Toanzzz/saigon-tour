import { once } from 'node:events'
import { type ServerType, serve } from '@hono/node-server'
import {
  type ClientSocketMessage,
  type ServerSocketMessage,
  ServerSocketMessageSchema,
} from '@saigon/shared'
import { afterAll, afterEach, beforeAll, beforeEach, expect } from 'vitest'
import { WebSocket } from 'ws'
import { createApp } from '@/app'
import { readConfig } from '@/shared'
import { fixture } from '../fixture'

export type Message<T extends ServerSocketMessage['type']> = Extract<
  ServerSocketMessage,
  { type: T }
>
export const origin = 'http://localhost:58000'
const clients: WebSocket[] = []

export class Peer {
  readonly messages: ServerSocketMessage[] = []
  readonly socket: WebSocket
  readonly closed: Promise<{ code: number; reason: string }>
  constructor(url: string, allowedOrigin = origin) {
    this.socket = new WebSocket(url, { origin: allowedOrigin })
    clients.push(this.socket)
    this.socket.on('error', () => {})
    this.socket.on('message', (data) => {
      this.messages.push(
        ServerSocketMessageSchema.parse(JSON.parse(String(data)))
      )
    })
    this.closed = new Promise((resolve) =>
      this.socket.once('close', (code, reason) =>
        resolve({ code, reason: reason.toString() })
      )
    )
  }
  send(message: ClientSocketMessage) {
    this.socket.send(JSON.stringify(message))
  }
  async wait<T extends ServerSocketMessage['type']>(
    type: T,
    predicate: (message: Message<T>) => boolean = () => true
  ): Promise<Message<T>> {
    const find = () =>
      this.messages.find(
        (message): message is Message<T> =>
          message.type === type && predicate(message as Message<T>)
      )
    const existing = find()
    if (existing) return existing
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => finish(new Error(`Missing ${type}`)), 3000)
      const onMessage = () => {
        const message = find()
        if (message) finish(undefined, message)
      }
      const finish = (error?: Error, message?: Message<T>) => {
        clearTimeout(timer)
        this.socket.off('message', onMessage)
        if (error) reject(error)
        else if (message) resolve(message)
      }
      this.socket.on('message', onMessage)
    })
  }
}

export function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('Missing test entity')
  return value
}

async function closeServer(server: ServerType) {
  await Promise.all(
    clients.splice(0).map(
      (socket) =>
        new Promise<void>((resolve) => {
          if (socket.readyState === WebSocket.CLOSED) return resolve()
          socket.once('close', () => resolve())
          socket.terminate()
        })
    )
  )
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  )
}

async function closeServerClients() {
  await Promise.all(
    clients.map(async (socket) => {
      if (socket.readyState === WebSocket.CLOSED) return
      const closed = once(socket, 'close')
      socket.terminate()
      await closed
    })
  )
}

/** Registers the shared realtime fixture hooks and exposes bound helpers. */
export function setupRealtime() {
  let fx: Awaited<ReturnType<typeof fixture>>
  let app: ReturnType<typeof createApp>
  let server: ServerType
  let url: string

  async function open(token?: string) {
    const peer = new Peer(url)
    await once(peer.socket, 'open')
    if (token) peer.send({ type: 'hello', token, protocol: 1 })
    return peer
  }
  async function start(apiKey?: string, fetcher: typeof fetch = fetch) {
    app = createApp({ ...readConfig({}), apiKey }, fetcher, fx)
    server = serve({
      fetch: app.fetch,
      port: 0,
      hostname: '127.0.0.1',
      websocket: { server: app.realtime.server },
    })
    if (!server.listening) await once(server, 'listening')
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('Missing port')
    url = `ws://127.0.0.1:${address.port}/ws`
  }
  async function stop() {
    await closeServerClients()
    app.realtime.shutdown()
    await closeServer(server)
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
    Peer,
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
      const identity = await fx.db.createGuest()
      const peer = await open(identity.token)
      const welcome = await peer.wait('welcome')
      return { ...identity, peer, welcome }
    },
    async move(peer: Peer, id: string, position: [number, number, number]) {
      peer.send({ type: 'state', position, heading: 0, ride: null })
      await expect
        .poll(() => app.realtime.manager.getPlayer(id)?.position)
        .toEqual(position)
    },
  }
}

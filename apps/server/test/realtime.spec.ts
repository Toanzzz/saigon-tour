import { once } from 'node:events'
import { type ServerType, serve } from '@hono/node-server'
import {
  type ClientSocketMessage,
  NPC_POSITIONS,
  type ServerSocketMessage,
  ServerSocketMessageSchema,
} from '@saigon/shared'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest'
import { WebSocket } from 'ws'
import { createApp } from '../src/app'
import { readConfig } from '../src/config'
import { fixture } from './fixture'

type Message<T extends ServerSocketMessage['type']> = Extract<
  ServerSocketMessage,
  { type: T }
>
const origin = 'http://localhost:58000'
const clients: WebSocket[] = []

class Peer {
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

async function open(url: string, token?: string) {
  const peer = new Peer(url)
  await once(peer.socket, 'open')
  if (token) peer.send({ type: 'hello', token, protocol: 1 })
  return peer
}

let fx: Awaited<ReturnType<typeof fixture>>
let app: ReturnType<typeof createApp>
let server: ServerType
let url: string
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
async function guest() {
  const identity = await fx.db.createGuest()
  const peer = await open(url, identity.token)
  const welcome = await peer.wait('welcome')
  return { ...identity, peer, welcome }
}
function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('Missing test entity')
  return value
}
async function move(
  peer: Peer,
  id: string,
  position: [number, number, number]
) {
  peer.send({ type: 'state', position, heading: 0, ride: null })
  await expect
    .poll(() => app.realtime.manager.getPlayer(id)?.position)
    .toEqual(position)
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

describe('real Node WebSocket transport', () => {
  it('rejects an untrusted origin before upgrading', async () => {
    const peer = new Peer(url, 'https://untrusted.test')
    const status = await new Promise<number | undefined>((resolve) =>
      peer.socket.once('unexpected-response', (_request, response) => {
        response.resume()
        peer.socket.terminate()
        resolve(response.statusCode)
      })
    )
    expect(status).toBe(403)
    expect(app.realtime.manager.rooms.size).toBe(0)
  })

  it('rejects bad tokens and unauthenticated state messages', async () => {
    const bad = await open(url, 'invalid-token')
    expect(await bad.closed).toMatchObject({
      code: 1008,
      reason: 'unauthorized',
    })
    const missing = await open(url)
    missing.send({ type: 'state', position: [0, 0, 0], heading: 0, ride: null })
    expect(await missing.closed).toMatchObject({
      code: 1008,
      reason: 'hello_required',
    })
    expect(app.realtime.manager.rooms.size).toBe(0)
  })

  it('closes a connection that never sends hello', async () => {
    const peer = await open(url)
    expect(await peer.closed).toMatchObject({
      code: 1008,
      reason: 'hello_timeout',
    })
  }, 7000)

  it('broadcasts joins, snapshots, state, emotes, and disconnects', async () => {
    const first = await guest()
    const second = await guest()
    expect(first.welcome.selfId).toBe(first.player.id)
    expect(second.welcome.room).toBe(first.welcome.room)
    expect(second.welcome.players).toHaveLength(2)
    expect(await first.peer.wait('player-joined')).toMatchObject({
      player: { id: second.player.id },
    })
    first.peer.send({
      type: 'state',
      position: [50, 0, 50],
      heading: 1.2,
      ride: 'bus',
    })
    const snapshot = await second.peer.wait('players', (m) =>
      m.players.some((p) => p.id === first.player.id && p.position[0] === 50)
    )
    expect(
      snapshot.players.find((p) => p.id === first.player.id)
    ).toMatchObject({
      name: first.player.name,
      color: first.player.color,
      position: [50, 0, 50],
      heading: 1.2,
      ride: 'bus',
    })
    first.peer.send({ type: 'emote', emote: 'wave' })
    expect(await second.peer.wait('emote')).toMatchObject({
      playerId: first.player.id,
      emote: 'wave',
    })
    first.peer.socket.close()
    expect(await second.peer.wait('player-left')).toMatchObject({
      playerId: first.player.id,
    })
  })

  it.each(['state', 'emote'] as const)(
    'closes excessive %s traffic',
    async (type) => {
      const { peer } = await guest()
      for (let i = 0; i < (type === 'state' ? 11 : 2); i++)
        peer.send(
          type === 'state'
            ? { type, position: [50, 0, 50], heading: i, ride: null }
            : { type, emote: 'wave' }
        )
      expect(await peer.closed).toMatchObject({
        code: 1008,
        reason: 'rate_limit',
      })
    }
  )

  it('rejects out-of-bounds positions and oversized messages', async () => {
    const first = await guest()
    first.peer.socket.send(
      JSON.stringify({
        type: 'state',
        position: [999, 0, 0],
        heading: 0,
        ride: null,
      })
    )
    expect((await first.peer.closed).code).toBe(1008)
    const second = await guest()
    second.peer.socket.send('x'.repeat(4097))
    expect((await second.peer.closed).code).toBe(1009)
  })

  it('places the 21st player in a separate room with isolated snapshots', async () => {
    const joined = []
    for (let i = 0; i < 21; i++) joined.push(await guest())
    const first = required(joined[0])
    const twentieth = required(joined[19])
    const last = required(joined[20])
    expect(twentieth.welcome.room).toBe(first.welcome.room)
    expect(twentieth.welcome.players).toHaveLength(20)
    expect(last.welcome.room).not.toBe(first.welcome.room)
    expect(last.welcome.players.map((p) => p.id)).toEqual([last.player.id])
    const snapshot = await last.peer.wait('players')
    expect(snapshot.players).toHaveLength(1)
  })

  it('replaces the old socket and keeps the replacement active in the same room', async () => {
    const first = await guest()
    const replacement = await open(url, first.token)
    const welcome = await replacement.wait('welcome')
    expect(await first.peer.closed).toMatchObject({
      code: 1000,
      reason: 'replaced',
    })
    expect(welcome.room).toBe(first.welcome.room)
    expect(welcome.players).toHaveLength(1)
    replacement.send({
      type: 'state',
      position: [80, 0, 60],
      heading: 2,
      ride: null,
    })
    await replacement.wait('players', (m) => m.players[0]?.position[0] === 80)
    expect(app.realtime.manager.getPlayer(first.player.id)?.position).toEqual([
      80, 0, 60,
    ])
  })

  it('broadcasts nearby fallback NPC lines and respects scheduler cooldown', async () => {
    app.realtime.manager.stop()
    const first = await guest()
    const second = await guest()
    const room = required(app.realtime.manager.room(first.player.id))
    first.peer.send({
      type: 'state',
      position: NPC_POSITIONS.hoa,
      heading: 0,
      ride: null,
    })
    // A snapshot proves the state message was processed before ticking the scheduler.
    app.realtime.manager.start()
    await first.peer.wait('players', (m) =>
      m.players.some(
        (p) =>
          p.id === first.player.id && p.position[0] === NPC_POSITIONS.hoa[0]
      )
    )
    app.realtime.manager.stop()
    const line = await second.peer.wait('npc-line', (m) => m.npcId === 'hoa')
    expect(line.reply).toContain('Chào bạn!')
    expect(await first.peer.wait('npc-line', (m) => m.npcId === 'hoa')).toEqual(
      line
    )
    room.scheduler.notify('hoa', 'player-nearby')
    expect(await room.scheduler.tick(Date.now() + 1000)).toEqual([])
  })

  it('deduplicates retransmitted spending events across a socket replacement', async () => {
    const { peer, token, player } = await guest()
    const message = {
      type: 'events' as const,
      sequence: 1,
      events: [{ type: 'spend' as const, amount: 5 }],
    }
    peer.send(message)
    expect((await peer.wait('world')).world.currency).toBe(25)
    const replacement = await open(url, token)
    await replacement.wait('welcome')
    await peer.closed
    replacement.send(message)
    expect((await replacement.wait('world')).world.currency).toBe(25)
    replacement.send({ ...message, sequence: 2 })
    expect(
      (await replacement.wait('world', (m) => m.sequence === 2)).world.currency
    ).toBe(20)
    expect((await fx.db.player(player.id)).world.currency).toBe(20)
  })

  it('retains a disconnected slot until 60 seconds and then deletes the empty room', async () => {
    app.realtime.manager.stop()
    const { peer, player, welcome } = await guest()
    const room = required(app.realtime.manager.room(player.id))
    peer.socket.close()
    await peer.closed
    await expect.poll(() => room.members.get(player.id)?.socket).toBeNull()
    const disconnectedAt = required(room.members.get(player.id)?.disconnectedAt)
    if (disconnectedAt === null) throw new Error('Missing disconnect timestamp')
    app.realtime.manager.tick(disconnectedAt + 59_999)
    expect(room.members.has(player.id)).toBe(true)
    expect(app.realtime.manager.rooms.has(welcome.room)).toBe(true)
    app.realtime.manager.tick(disconnectedAt + 60_000)
    expect(app.realtime.manager.room(player.id)).toBeUndefined()
    expect(app.realtime.manager.rooms.has(welcome.room)).toBe(false)
  })

  it('caps live room barks and broadcasts fallback after the daily allowance', async () => {
    await stop()
    let calls = 0
    await start('test-key', async () => {
      calls++
      return new Response(
        JSON.stringify({
          id: 'bark',
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: 'Fresh market morning!' },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 5 },
        }),
        { headers: { 'content-type': 'application/json' } }
      )
    })
    app.realtime.manager.stop()
    const { peer, player } = await guest()
    const room = required(app.realtime.manager.room(player.id))
    await move(peer, player.id, NPC_POSITIONS.hoa)
    room.scheduler.notify('hoa', 'player-nearby')
    await room.scheduler.tick(Date.now())
    expect((await peer.wait('npc-line', (m) => m.npcId === 'hoa')).reply).toBe(
      'Fresh market morning!'
    )
    await move(peer, player.id, NPC_POSITIONS.linh)
    room.scheduler.notify('linh', 'player-nearby')
    await room.scheduler.tick(Date.now())
    expect(
      (await peer.wait('npc-line', (m) => m.npcId === 'linh')).reply
    ).toContain('Chào bạn!')
    expect(calls).toBe(1)
    const ledger = await fx.sql.query<{ barks: number }>(
      'SELECT barks FROM model_spend'
    )
    expect(ledger.rows).toEqual([{ barks: 1 }])
  })
})

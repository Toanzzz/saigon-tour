import type { Server as HttpServer } from 'node:http'
import { createAuthContext, matchMaker } from '@colyseus/core'
import { setTransport } from '@colyseus/core/Transport'
import { WebSocketTransport } from '@colyseus/ws-transport'
import { type AvatarBody, type Look, WORLD_ROOM } from '@saigon/shared'
import type { Hono } from 'hono'
import type { Auth } from '@/features/auth'
import { CityDirector } from '@/features/director'
import type { NpcHarness } from '@/features/npc'
import { PartyService } from '@/features/party'
import { RoomManager, status, WorldRoom } from '@/features/realtime'
import type { GameDb, ServerConfig } from '@/shared'
import type { Env } from './routes/deps'

export type {
  NpcBarker,
  Room,
  RoomMember,
  RoomSocket,
} from '@/features/realtime'
export { RoomManager } from '@/features/realtime'

/** Colyseus room WebSocket paths: `/<processId>/<roomId>`. */
const ROOM_PATH = /^\/[\w-]+\/[\w-]+\/?$/
const MAX_CONNECTIONS = 400
let booted: Promise<void> | null = null
/** Serialize matchmaking so two world rooms can't be created at once. */
let matchmakeChain: Promise<unknown> = Promise.resolve()

/**
 * Wire Colyseus into the existing Hono app: matchmaking is a Hono route
 * (our CORS and body limits apply) and room sockets share the Node server.
 */
export function createRealtime(
  app: Hono<Env>,
  config: ServerConfig,
  harness: NpcHarness,
  auth: Auth,
  db: GameDb,
  now = Date.now,
  fetcher: typeof fetch = fetch
) {
  const manager = new RoomManager(
    harness,
    now,
    (city) => new CityDirector(city, config, db, fetcher)
  )
  const party = new PartyService(manager, db, now)
  harness.game.party = party
  harness.game.city = (id) => manager.room(id)?.city.snapshot() ?? null
  harness.game.push = (id, save, completed) => {
    if (completed)
      manager.send(id, { type: 'quest-completed', ...save, quest: completed })
    else
      manager.send(id, {
        type: 'world',
        ...save,
        sequence: manager.room(id)?.members.get(id)?.acknowledgedSequence ?? 0,
      })
  }

  WorldRoom.deps = {
    auth,
    db,
    game: harness.game,
    manager,
    hooks: {
      onMessage: (id, message) => party.handle(id, message),
      onConnected: (id) => party.connected(id),
    },
  }
  let transport: WebSocketTransport | undefined
  let stopped = false

  app.post('/matchmake/:method/:room', async (c) => {
    if (stopped) return c.json({ error: 'server_restart' }, 503)
    const origin = c.req.header('Origin')
    if (!origin || !config.origins.includes(origin))
      return c.json({ error: 'forbidden_origin' }, 403)
    if (c.req.param('room') !== WORLD_ROOM)
      return c.json({ code: 4212, error: 'unknown_room' }, 404)
    if (matchMaker.stats.local.ccu >= MAX_CONNECTIONS)
      return c.json({ error: 'server_full' }, 503)
    const body = await c.req.json().catch(() => ({}))
    const method = c.req.param('method')
    const ctx = createAuthContext({
      headers: c.req.raw.headers,
      req: c.req.raw,
    })
    const run = matchmakeChain.then(() =>
      matchMaker.controller.invokeMethod(
        method,
        WORLD_ROOM,
        typeof body === 'object' && body ? body : {},
        ctx
      )
    )
    matchmakeChain = run.catch(() => undefined)
    try {
      return c.json(await run)
    } catch (error) {
      const { code, message } = error as { code?: number; message?: string }
      // `room_full` is a soft refusal: the client waits and retries.
      return c.json(
        { code: code ?? 4211, error: message ?? 'matchmake_failed' },
        message === 'room_full' ? 503 : 400
      )
    }
  })

  app.get('/realtime/status', (c) => {
    // Same-origin GETs omit `Origin`; a cross-origin browser always sends it,
    // and the app-wide CORS layer blocks disallowed origins. Reject only a
    // present-but-unlisted origin here.
    const origin = c.req.header('Origin')
    if (origin && !config.origins.includes(origin))
      return c.json({ error: 'forbidden_origin' }, 403)
    return c.json(status(manager, now))
  })

  manager.start()
  return {
    manager,
    party,
    updateProfile(
      playerId: string,
      profile: { name: string; body: AvatarBody }
    ) {
      const player = manager.getPlayer(playerId)
      if (player) {
        player.name = profile.name
        player.body = profile.body
      }
    },
    /** Push a freshly equipped look onto the player's live presence, if connected. */
    updateLook(playerId: string, look: Look | null) {
      return manager.updateLook(playerId, look)
    },
    /** Attach room sockets to the listening HTTP server. */
    async attach(server: HttpServer) {
      booted ??= (async () => {
        await matchMaker.setup()
        matchMaker.defineRoomType(WORLD_ROOM, WorldRoom)
        await matchMaker.accept()
      })()
      await booted
      transport = new WebSocketTransport({
        noServer: true,
        maxPayload: 4096,
        beforeUpgrade(_request, context) {
          const origin = context.headers.get('origin')
          if (!origin || !config.origins.includes(origin))
            return new Response('forbidden_origin', { status: 403 })
        },
      })
      transport.attachToServer(server, {
        filter: (req) =>
          ROOM_PATH.test(new URL(req.url ?? '/', 'http://x').pathname),
      })
      setTransport(transport)
    },
    /** Close every room client and stop accepting sockets. */
    async shutdown() {
      stopped = true
      manager.shutdown()
      await Promise.allSettled(matchMaker.disconnectAll(1012))
      transport?.shutdown()
    },
  }
}

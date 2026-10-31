import type { MastraCompositeStore } from '@mastra/core/storage'
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { cors } from 'hono/cors'
import { type AuthDatabase, createAuth } from '@/features/auth'
import { NpcHarness } from '@/features/npc'
import {
  type Fetcher,
  type GameDb,
  log,
  readConfig,
  type ServerConfig,
} from '@/shared'
import { createRealtime } from './realtime'
import type { Env, RouteDeps } from './routes/deps'
import { meRoutes } from './routes/me'
import { npcRoutes } from './routes/npc'
import { sessionRoutes } from './routes/session'

export type { Fetcher } from '@/shared/http'
export interface AppServices {
  db: GameDb
  orm: AuthDatabase
  storage?: MastraCompositeStore
  now?: () => number
}

/** Chained route tree used both for mounting and RPC type inference. */
function createRoutes(deps: RouteDeps) {
  return new Hono<Env>()
    .route('/', sessionRoutes(deps))
    .route('/me', meRoutes(deps))
    .route('/npc', npcRoutes(deps))
}

/** RPC contract for `hc<AppType>`; excludes the non-RPC `/ws` upgrade. */
export type AppType = ReturnType<typeof createRoutes>
export type AppInstance = ReturnType<typeof createApp>

export function createApp(
  config: ServerConfig = readConfig(),
  fetcher: Fetcher = fetch,
  services: AppServices
) {
  const { db, storage } = services
  const auth = createAuth(config, services.orm, db)
  const harness = new NpcHarness(config, fetcher, db, storage)
  const app = new Hono<Env>()
  app.use(
    '*',
    cors({
      origin: (origin) =>
        config.origins.includes(origin) ? origin : undefined,
      credentials: true,
      allowMethods: ['GET', 'POST', 'OPTIONS'],
      exposeHeaders: ['set-auth-token'],
      allowHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86400,
    })
  )
  app.use(
    '*',
    bodyLimit({
      maxSize: 16 * 1024,
      onError: (c) => c.json({ error: 'request_too_large' }, 413),
    })
  )
  const realtime = createRealtime(app, config, harness, auth, db, services.now)
  app.route('/', createRoutes({ auth, config, db, harness, realtime }))
  app.onError((_error, c) => {
    log('request_failed', 'Storage or request unavailable', 'warn')
    return c.json({ error: 'service_unavailable' }, 503)
  })
  return Object.assign(app, { auth, harness, db, realtime })
}

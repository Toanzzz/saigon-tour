import type { MastraCompositeStore } from '@mastra/core/storage'
import { InteractRequestSchema, NpcIdSchema } from '@saigon/shared'
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { cors } from 'hono/cors'
import { isLiveConfigured, readConfig, type ServerConfig } from './config'
import type { GameDb } from './db'
import { log } from './logger'
import { NpcHarness } from './npc/mastra'
import { createRealtime } from './realtime'

export type Fetcher = typeof fetch
export interface AppServices {
  db: GameDb
  storage?: MastraCompositeStore
  now?: () => number
}
export function createApp(
  config: ServerConfig = readConfig(),
  fetcher: Fetcher = fetch,
  services: AppServices
) {
  const { db, storage } = services
  const harness = new NpcHarness(config, fetcher, db, storage)
  const app = new Hono()
  app.use(
    '*',
    cors({
      origin: (origin) =>
        config.origins.includes(origin) ? origin : undefined,
      credentials: true,
      allowMethods: ['GET', 'POST', 'OPTIONS'],
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
  app.get('/health', async (c) => {
    try {
      await db.health()
    } catch {
      return c.json({ ok: false, db: 'down' }, 503)
    }
    return c.json({
      ok: true,
      db: 'up',
      mode: isLiveConfigured(config) ? 'live' : 'fallback',
      model: isLiveConfigured(config) ? config.model : null,
    })
  })
  app.post('/guest', async (c) => c.json(await db.createGuest(), 201))
  app.get('/me', async (c) => {
    const player = await db.authenticate(
      c.req.header('Authorization')?.replace(/^Bearer /, '') ?? ''
    )
    return player ? c.json({ player }) : c.json({ error: 'unauthorized' }, 401)
  })
  app.post('/me/reset', async (c) => {
    const player = await db.authenticate(
      c.req.header('Authorization')?.replace(/^Bearer /, '') ?? ''
    )
    if (!player) return c.json({ error: 'unauthorized' }, 401)
    await harness.clearMemory(player.id)
    await realtime.party.leave(player.id)
    realtime.manager.remove(player.id)
    return c.json({ player: await db.reset(player.id) })
  })
  app.post('/npc/:npcId/interact', async (c) => {
    const npc = NpcIdSchema.safeParse(c.req.param('npcId'))
    if (!npc.success) return c.json({ error: 'unknown_npc' }, 404)
    const player = await db.authenticate(
      c.req.header('Authorization')?.replace(/^Bearer /, '') ?? ''
    )
    if (!player) return c.json({ error: 'unauthorized' }, 401)
    const request = InteractRequestSchema.safeParse(
      await c.req.json().catch(() => null)
    )
    if (!request.success) return c.json({ error: 'invalid_request' }, 400)
    return c.json(await harness.interact(npc.data, request.data, player.id))
  })
  app.onError((_error, c) => {
    log('request_failed', 'Storage or request unavailable', 'warn')
    return c.json({ error: 'service_unavailable' }, 503)
  })
  const realtime = createRealtime(app, config, harness, db, services.now)
  return Object.assign(app, { harness, db, realtime })
}
export type AppType = ReturnType<typeof createApp>

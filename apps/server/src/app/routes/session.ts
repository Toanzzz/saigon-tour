import { Hono } from 'hono'
import { isLiveConfigured } from '@/shared'
import type { Env, RouteDeps } from './deps'

/** Public routes: liveness probe and guest creation. */
export function sessionRoutes({ config, db }: RouteDeps) {
  return new Hono<Env>()
    .get('/health', async (c) => {
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
    .post('/guest', async (c) => c.json(await db.createGuest(), 201))
}

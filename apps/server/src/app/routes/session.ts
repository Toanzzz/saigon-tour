import { Hono } from 'hono'
import { authRequest } from '@/features/auth'
import { isLiveConfigured } from '@/shared'
import type { Env, RouteDeps } from './deps'

/** Public routes: liveness probe, auth capabilities, and Better Auth. */
export function sessionRoutes({ auth, config, db }: RouteDeps) {
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
    .get('/auth/providers', (c) => c.json({ meta: Boolean(config.meta) }))
    .on(['GET', 'POST'], '/auth/*', (c) =>
      auth.handler(authRequest(config, c.req.raw))
    )
}

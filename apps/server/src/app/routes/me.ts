import { Hono } from 'hono'
import { requireAuth } from './auth'
import type { Env, RouteDeps } from './deps'

/** Authenticated player routes, mounted under `/me`. */
export function meRoutes({ db, harness, realtime }: RouteDeps) {
  return new Hono<Env>()
    .use('*', requireAuth(db))
    .get('/', (c) => c.json({ player: c.var.player }))
    .post('/reset', async (c) => {
      const { id } = c.var.player
      await harness.clearMemory(id)
      await realtime.party.leave(id)
      realtime.manager.remove(id)
      return c.json({ player: await db.reset(id) })
    })
}

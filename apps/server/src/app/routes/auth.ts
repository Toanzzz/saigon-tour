import type { Auth } from '@/features/auth'
import type { GameDb } from '@/shared'
import { factory } from './deps'

/** Better Auth session (cookie or bearer): sets `c.var.player` or returns 401. */
export const requireAuth = (auth: Auth, db: GameDb) =>
  factory.createMiddleware(async (c, next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers })
    if (!session) return c.json({ error: 'unauthorized' }, 401)
    c.set('player', await db.ensurePlayer(session.user))
    c.set('user', session.user)
    await next()
  })

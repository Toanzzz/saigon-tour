import type { GameDb } from '@/shared'
import { factory } from './deps'

/** Bearer-token auth: sets `c.var.player` or returns 401. */
export const requireAuth = (db: GameDb) =>
  factory.createMiddleware(async (c, next) => {
    const token = c.req.header('Authorization')?.replace(/^Bearer /, '') ?? ''
    const player = await db.authenticate(token)
    if (!player) return c.json({ error: 'unauthorized' }, 401)
    c.set('player', player)
    await next()
  })

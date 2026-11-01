import { zValidator } from '@hono/zod-validator'
import { PlayerNameSchema } from '@saigon/shared'
import { Hono } from 'hono'
import { z } from 'zod'
import { requireAuth } from './auth'
import type { Env, RouteDeps } from './deps'

const ProfileSchema = z.object({ name: PlayerNameSchema }).strict()

/** Authenticated player routes, mounted under `/me`. */
export function meRoutes({ auth, db, harness, realtime }: RouteDeps) {
  return new Hono<Env>()
    .use('*', requireAuth(auth, db))
    .get('/', async (c) =>
      c.json({
        player: await harness.game.expire(c.var.player.id),
        account: { anonymous: Boolean(c.var.user.isAnonymous) },
      })
    )
    .post(
      '/profile',
      zValidator('json', ProfileSchema, (result, c) => {
        if (!result.success) return c.json({ error: 'invalid_name' }, 400)
      }),
      async (c) => {
        const { name } = c.req.valid('json')
        await auth.api.updateUser({
          headers: c.req.raw.headers,
          body: { name },
        })
        const player = await db.rename(c.var.player.id, name)
        realtime.rename(player.id, name)
        return c.json({ player })
      }
    )
    .post('/quests/:questId/abandon', async (c) => {
      const questId = c.req.param('questId')
      if (!/^q_[a-zA-Z0-9_-]{1,64}$/.test(questId))
        return c.json({ error: 'invalid_quest_id' }, 400)
      return c.json({
        player: await harness.game.abandon(c.var.player.id, questId),
      })
    })
    .post('/reset', async (c) => {
      const { id } = c.var.player
      await harness.clearMemory(id)
      await realtime.party.leave(id)
      realtime.manager.remove(id)
      return c.json({ player: await db.reset(id) })
    })
}

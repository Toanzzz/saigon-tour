import { zValidator } from '@hono/zod-validator'
import { InteractRequestSchema, NpcIdSchema } from '@saigon/shared'
import { Hono } from 'hono'
import { z } from 'zod'
import { requireAuth } from './auth'
import type { Env, RouteDeps } from './deps'

const NpcParamSchema = z.object({ npcId: NpcIdSchema })

/** NPC interaction routes, mounted under `/npc`. */
export function npcRoutes({ auth, db, harness }: RouteDeps) {
  return new Hono<Env>()
    .get(
      '/:npcId/history',
      zValidator('param', NpcParamSchema),
      requireAuth(auth, db),
      zValidator(
        'query',
        z.object({ limit: z.coerce.number().int().min(1).max(60).default(30) })
      ),
      async (c) =>
        c.json(
          await harness.history(
            c.req.valid('param').npcId,
            c.var.player.id,
            c.req.valid('query').limit
          )
        )
    )
    .post(
      '/:npcId/interact',
      // Unknown NPCs are rejected before auth, matching the original contract.
      zValidator('param', NpcParamSchema, (result, c) => {
        if (!result.success) return c.json({ error: 'unknown_npc' }, 404)
      }),
      requireAuth(auth, db),
      zValidator('json', InteractRequestSchema, (result, c) => {
        if (!result.success) return c.json({ error: 'invalid_request' }, 400)
      }),
      async (c) =>
        c.json(
          await harness.interact(
            c.req.valid('param').npcId,
            c.req.valid('json'),
            c.var.player.id
          )
        )
    )
}

import { zValidator } from '@hono/zod-validator'
import {
  MarketItemIdSchema,
  NpcIdSchema,
  PlayerEventSchema,
} from '@saigon/shared'
import { Hono } from 'hono'
import { z } from 'zod'
import { ShopError, ShopService } from '@/features/shop'
import { requireAuth } from './auth'
import type { Env, RouteDeps } from './deps'

const common = {
  requestId: z.uuid(),
  events: z.array(PlayerEventSchema).max(16).default([]),
}
const BuySchema = z
  .object({
    ...common,
    npcId: NpcIdSchema,
    itemId: MarketItemIdSchema.optional(),
    offerId: z.string().min(1).max(80).optional(),
  })
  .strict()
  .refine((input) => Boolean(input.itemId) !== Boolean(input.offerId))
const UseSchema = z.object({ ...common, itemId: MarketItemIdSchema }).strict()

/** Purchases and consumption have one durable receipt per logical player action. */
export function shopRoutes({ auth, db, realtime }: RouteDeps) {
  const shop = new ShopService(db, realtime.manager)
  return new Hono<Env>()
    .use('*', requireAuth(auth, db))
    .post('/shop/buy', zValidator('json', BuySchema), async (c) => {
      try {
        return c.json(await shop.buy(c.var.player.id, c.req.valid('json')))
      } catch (error) {
        if (error instanceof ShopError)
          return c.json({ error: error.message }, 409)
        throw error
      }
    })
    .post('/items/use', zValidator('json', UseSchema), async (c) => {
      try {
        return c.json(await shop.use(c.var.player.id, c.req.valid('json')))
      } catch (error) {
        if (error instanceof ShopError)
          return c.json({ error: error.message }, 409)
        throw error
      }
    })
}

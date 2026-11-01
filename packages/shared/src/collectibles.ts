import { z } from 'zod'

/** A collectible coin placed in the world. Collecting one grants `amount`
 * coins exactly once per player, recorded in the server `coin_pickups` ledger.
 * Positions are authored in world space (x, z on the ground plane) and live in
 * one module so the client renderer and the layout lint stay in sync. */
export const CoinPickupIdSchema = z
  .string()
  .regex(/^coin_[a-z0-9_]{1,32}$/)
  .brand<'CoinPickupId'>()
export type CoinPickupId = z.infer<typeof CoinPickupIdSchema>

export const COIN_PICKUP_AMOUNT = 5

export interface CoinPickup {
  id: CoinPickupId
  /** World-space ground position [x, z]; the coin floats above it. */
  at: readonly [number, number]
  amount: number
}

const coin = (id: string, x: number, z: number): CoinPickup => ({
  id: CoinPickupIdSchema.parse(id),
  at: [x, z] as const,
  amount: COIN_PICKUP_AMOUNT,
})

/**
 * Authored coin positions within the ~160×160 District 1 bounds. Each sits on
 * an open walkway (checked against the solids registry by the layout lint), on
 * the routes between Bến Thành, Nguyễn Huệ, the park, and the river.
 */
export const COIN_PICKUPS: readonly CoinPickup[] = [
  coin('coin_leloi_1', -14, 6),
  coin('coin_leloi_2', -2, 2),
  coin('coin_nguyenhue_1', 34, -6),
  coin('coin_park_approach', 20, 2),
  coin('coin_river_walk', 20, 24),
  coin('coin_market_gate', -20, 12),
] as const

export const COIN_PICKUP_IDS: readonly CoinPickupId[] = COIN_PICKUPS.map(
  (entry) => entry.id
)

const BY_ID = new Map(COIN_PICKUPS.map((entry) => [entry.id, entry]))
export const coinPickup = (id: CoinPickupId): CoinPickup | undefined =>
  BY_ID.get(id)

export const CoinPickupResponseSchema = z.object({
  /** True when this call recorded a new pickup (false if already collected). */
  granted: z.boolean(),
  amount: z.number().int().min(0),
})
export type CoinPickupResponse = z.infer<typeof CoinPickupResponseSchema>

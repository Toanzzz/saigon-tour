import { z } from 'zod'
import { COSMETIC_UNLOCKS } from './cosmetics'
import { PET_UNLOCKS } from './pets'
import { VEHICLE_UNLOCKS } from './vehicles'

export * from './avatar'
export * from './catalog'

import {
  UNLOCK_SLOTS,
  type UnlockDef,
  type UnlockGiver,
  type UnlockSlot,
  type UnlockTier,
} from './catalog'

/** Minimum friendship level for each unlock tier. Shared by the giver gate and the client chip. */
export const FRIENDSHIP_TIERS: Record<UnlockTier, number> = {
  neutral: 0,
  warm: 2,
  close: 4,
}

const ALL_UNLOCKS: UnlockDef[] = [
  ...COSMETIC_UNLOCKS,
  ...VEHICLE_UNLOCKS,
  ...PET_UNLOCKS,
]

export const UNLOCKS: Record<string, UnlockDef> = Object.fromEntries(
  ALL_UNLOCKS.map((entry) => [entry.id, entry])
)

export const UNLOCK_IDS = ALL_UNLOCKS.map((entry) => entry.id) as [
  string,
  ...string[],
]
export const UnlockIdSchema = z.enum(UNLOCK_IDS)
export type UnlockId = z.infer<typeof UnlockIdSchema>

/** Givers grant their signature unlocks in tier order: neutral, then warm, then close. */
const TIER_ORDER: UnlockTier[] = ['neutral', 'warm', 'close']

export const GIVER_UNLOCKS: Record<UnlockGiver, UnlockId[]> = (() => {
  const map = {} as Record<UnlockGiver, UnlockId[]>
  for (const entry of ALL_UNLOCKS) {
    const list = map[entry.giver] ?? []
    list.push(entry.id)
    map[entry.giver] = list
  }
  for (const giver of Object.keys(map) as UnlockGiver[])
    map[giver].sort(
      (a, b) =>
        TIER_ORDER.indexOf(UNLOCKS[a].tier) -
        TIER_ORDER.indexOf(UNLOCKS[b].tier)
    )
  return map
})()

export const EquippedSchema = z
  .object({
    hat: UnlockIdSchema.optional(),
    outfit: UnlockIdSchema.optional(),
    accessory: UnlockIdSchema.optional(),
    vehicle: UnlockIdSchema.optional(),
    pet: UnlockIdSchema.optional(),
  })
  .strict()
export type Equipped = z.infer<typeof EquippedSchema>

export const UnlocksSchema = z
  .object({
    owned: z.array(UnlockIdSchema).max(64).default([]),
    equipped: EquippedSchema.default({}),
  })
  .strict()
export type Unlocks = z.infer<typeof UnlocksSchema>

export const EMPTY_UNLOCKS: Unlocks = { owned: [], equipped: {} }

/** Player-visible look pushed to the room so remote avatars match the wardrobe. */
export const LookSchema = EquippedSchema
export type Look = Equipped

export const tierAllows = (friendship: number, tier: UnlockTier) =>
  friendship >= FRIENDSHIP_TIERS[tier]

/**
 * Pick the giver's first signature unlock the player can still earn: not owned,
 * not already promised by another active quest, and within the giver's current tier.
 */
export function selectUnlock(
  giver: UnlockGiver,
  options: {
    owned: readonly UnlockId[]
    promised: readonly UnlockId[]
    friendship: number
  }
): UnlockId | undefined {
  const owned = new Set(options.owned)
  const promised = new Set(options.promised)
  for (const id of GIVER_UNLOCKS[giver] ?? []) {
    if (owned.has(id) || promised.has(id)) continue
    if (!tierAllows(options.friendship, UNLOCKS[id].tier)) continue
    return id
  }
  return undefined
}

export const slotOf = (id: UnlockId): UnlockSlot => UNLOCKS[id].slot
export { UNLOCK_SLOTS }

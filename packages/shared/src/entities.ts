import { z } from 'zod'
import { UnlockIdSchema } from './unlocks'

export const NEIGHBOR_IDS = [
  'hoa',
  'tam',
  'linh',
  'ba',
  'mai',
  'alex',
  'vy',
  'son',
  'thao',
] as const
export const NeighborIdSchema = z.enum(NEIGHBOR_IDS)
export type NeighborId = z.infer<typeof NeighborIdSchema>
export const RESIDENT_IDS = [
  'bread-vendor',
  'fruit-vendor',
  'market-browse',
  'market-walk',
  'market-family',
  'coffee-friend',
  'coffee-reader',
  'commuter',
  'student',
  'park-reader',
  'park-stretch',
  'plaza-friends',
  'plaza-stroll',
  'opera-visitor',
  'postcard-reader',
  'square-tourist',
  'riverside-friends',
  'river-jogger',
  'alley-vendor',
  'alley-diner',
] as const
export const NpcIdSchema = z.enum([...NEIGHBOR_IDS, ...RESIDENT_IDS])
export type NpcId = z.infer<typeof NpcIdSchema>
export const LocationIdSchema = z.enum([
  'market',
  'park',
  'cathedral',
  'cityhall',
  'river',
  'opera',
  'postoffice',
  'alley',
])
export type LocationId = z.infer<typeof LocationIdSchema>
export const ItemIdSchema = z.enum([
  'herbs',
  'postcard',
  'photo',
  'noodles',
  'broth',
  'baguette',
  'coffee',
  'banana',
  'pho',
  'cake',
  'coffee-beans',
  'sheet-music',
  'lanterns',
])
export type ItemId = z.infer<typeof ItemIdSchema>
export const MilestoneIdSchema = z.enum(['evening-concert'])
export type MilestoneId = z.infer<typeof MilestoneIdSchema>
export const MarketItemIdSchema = z.enum([
  'coffee',
  'banana',
  'baguette',
  'pho',
])
export type MarketItemId = z.infer<typeof MarketItemIdSchema>
export const MARKET_ITEMS = {
  coffee: {
    label: 'iced milk coffee',
    price: 3,
    icon: 'coffee',
    effect: { kind: 'drain', amount: 0.5, durationMs: 180_000 },
  },
  banana: {
    label: 'ripe banana',
    price: 2,
    icon: 'banana',
    effect: { kind: 'restore', amount: 40, durationMs: 0 },
  },
  baguette: {
    label: 'bánh mì',
    price: 5,
    icon: 'baguette',
    effect: { kind: 'regen', amount: 1.5, durationMs: 180_000 },
  },
  pho: {
    label: 'bowl of phở',
    price: 8,
    icon: 'pho',
    effect: { kind: 'capacity', amount: 50, durationMs: 180_000 },
  },
} as const
export const SourceSchema = z.enum(['live', 'fallback'])
export type AgentSource = z.infer<typeof SourceSchema>

export const RewardSchema = z
  .object({
    currency: z.number().int().min(0).max(100),
    itemId: ItemIdSchema.nullable(),
    reputation: z.number().int().min(0).max(5),
    // Optional so legacy jsonb quest/completed rows still parse under strict zod.
    unlockId: UnlockIdSchema.optional(),
    // Completion bonuses folded into currency; recorded for the reward card.
    bonus: z
      .object({
        thrifty: z.number().int().min(0).max(100).optional(),
        sharp: z.number().int().min(0).max(100).optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
export type Reward = z.infer<typeof RewardSchema>

export { FRAGILE_ITEM_IDS, type FragileItemId } from '@saigon/npc-kit'

import { z } from 'zod'

export const NpcIdSchema = z.enum([
  'hoa',
  'tam',
  'linh',
  'ba',
  'mai',
  'alex',
  'vy',
  'son',
  'thao',
])
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
])
export type ItemId = z.infer<typeof ItemIdSchema>
export const MarketItemIdSchema = z.enum(['coffee', 'banana'])
export type MarketItemId = z.infer<typeof MarketItemIdSchema>
export const MARKET_ITEMS = {
  coffee: { label: 'Cà phê sữa', price: 3 },
  banana: { label: 'Chuối chín', price: 2 },
} as const satisfies Record<MarketItemId, { label: string; price: number }>
export const SourceSchema = z.enum(['live', 'fallback'])
export type AgentSource = z.infer<typeof SourceSchema>

export const RewardSchema = z
  .object({
    currency: z.number().int().min(0).max(100),
    itemId: ItemIdSchema.nullable(),
    reputation: z.number().int().min(0).max(5),
  })
  .strict()
export type Reward = z.infer<typeof RewardSchema>

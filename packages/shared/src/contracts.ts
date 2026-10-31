import { z } from 'zod'
import { PartySnapshotSchema } from './party'

export const NpcIdSchema = z.enum(['hoa', 'tam', 'linh', 'ba', 'mai', 'alex'])
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

export const ObjectiveSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('GO_TO'), locationId: LocationIdSchema }).strict(),
  z.object({ type: z.literal('TALK_TO'), npcId: NpcIdSchema }).strict(),
  z
    .object({
      type: z.literal('COLLECT'),
      itemId: ItemIdSchema,
      count: z.number().int().min(1).max(3),
    })
    .strict(),
  z
    .object({
      type: z.literal('DELIVER'),
      itemId: ItemIdSchema,
      npcId: NpcIdSchema,
    })
    .strict(),
])
export const QuestSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9_-]{1,64}$/),
    title: z.string().min(1).max(80),
    description: z.string().min(1).max(360),
    objective: ObjectiveSchema,
    reward: RewardSchema,
    giverNpcId: NpcIdSchema,
  })
  .strict()
export type Quest = z.infer<typeof QuestSchema>

export const WorldStateSchema = z
  .object({
    locationId: LocationIdSchema,
    inventory: z.partialRecord(ItemIdSchema, z.number().int().min(0).max(100)),
    visitedLocations: z.array(LocationIdSchema).max(16),
    talkedTo: z.array(NpcIdSchema).max(32),
    deliveredItems: z
      .array(
        z
          .string()
          .regex(
            /^(herbs|postcard|photo|noodles|broth|baguette|coffee):(hoa|tam|linh|ba|mai|alex)$/
          )
      )
      .max(32),
    completedQuestIds: z.array(z.string().max(64)).max(32),
    currency: z.number().int().min(0).max(100000),
  })
  .strict()
export type WorldState = z.infer<typeof WorldStateSchema>

/* Agent harness: POST /npc/:npcId/interact. */
export const TimeOfDaySchema = z.enum([
  'morning',
  'afternoon',
  'evening',
  'night',
])
export type TimeOfDay = z.infer<typeof TimeOfDaySchema>
export const PlayerEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('visit'), locationId: LocationIdSchema }).strict(),
  z.object({ type: z.literal('talk'), npcId: NpcIdSchema }).strict(),
  z
    .object({
      type: z.literal('deliver'),
      itemId: ItemIdSchema,
      npcId: NpcIdSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal('spend'),
      amount: z.number().int().min(1).max(20),
    })
    .strict(),
  z
    .object({
      type: z.literal('purchase'),
      itemId: MarketItemIdSchema,
    })
    .strict(),
])
export type PlayerEvent = z.infer<typeof PlayerEventSchema>
export const InteractRequestSchema = z
  .object({
    message: z.string().trim().min(1).max(500),
    intent: z.enum(['chat', 'help', 'check', 'greet', 'team']).default('chat'),
    events: z.array(PlayerEventSchema).max(16).default([]),
    worldContext: z
      .object({
        playerLocation: LocationIdSchema,
        nearbyNpcs: z.array(NpcIdSchema).max(8).default([]),
        timeOfDay: TimeOfDaySchema,
      })
      .strict(),
  })
  .strict()
export type InteractRequest = z.infer<typeof InteractRequestSchema>
export const QuestOutcomeSchema = z.enum(['offered', 'completed', 'incomplete'])
export const InteractResponseSchema = z
  .object({
    revision: z.number().int().min(0).default(0),
    cached: z.boolean(),
    party: PartySnapshotSchema.nullable(),
    npcId: NpcIdSchema,
    reply: z.string().min(1).max(700),
    source: SourceSchema,
    degraded: z.boolean(),
    world: WorldStateSchema,
    quest: QuestSchema.nullable(),
    questEvent: z
      .object({
        type: QuestOutcomeSchema,
        quest: QuestSchema,
        reward: RewardSchema,
      })
      .strict()
      .nullable(),
    toolCalls: z.array(z.string().max(40)).max(8),
  })
  .strict()
export type InteractResponse = z.infer<typeof InteractResponseSchema>

export const GuestPlayerSchema = z.object({
  revision: z.number().int().min(0).default(0),
  id: z.uuid(),
  name: z.string(),
  color: z.string(),
  world: WorldStateSchema,
  quest: QuestSchema.nullable(),
  completed: z.array(QuestSchema),
  reputation: z.number(),
})
export type GuestPlayer = z.infer<typeof GuestPlayerSchema>

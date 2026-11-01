import { z } from 'zod'
import {
  ItemIdSchema,
  LocationIdSchema,
  MarketItemIdSchema,
  NpcIdSchema,
  SourceSchema,
} from './entities'
import { LocaleSchema } from './locale'
import { PartySnapshotSchema } from './party'
import { FriendshipEventSchema, FriendshipMapSchema } from './quest/friendship'
import {
  CompletedQuestSchema,
  QuestEventSchema,
  QuestSchema,
} from './quest/schema'
import { AvatarBodySchema, UnlocksSchema } from './unlocks'

export * from './entities'
export * from './quest/schema'

export const WorldStateSchema = z
  .object({
    locationId: LocationIdSchema,
    inventory: z.partialRecord(ItemIdSchema, z.number().int().min(0).max(100)),
    visitedLocations: z.array(LocationIdSchema).max(16),
    talkedTo: z.array(NpcIdSchema).max(32),
    deliveredItems: z
      .array(z.templateLiteral([ItemIdSchema, ':', NpcIdSchema]))
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
/** Ride modes. Moved from the client so spend events can carry one. */
export const TravelModeSchema = z.enum(['bus', 'metro', 'xeom', 'cyclo'])
export type TravelMode = z.infer<typeof TravelModeSchema>
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
      mode: TravelModeSchema.optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal('purchase'),
      itemId: MarketItemIdSchema,
      credit: z.literal(true).optional(),
    })
    .strict(),
])
export type PlayerEvent = z.infer<typeof PlayerEventSchema>
export const InteractRequestSchema = z
  .object({
    message: z.string().trim().max(500).default(''),
    // Deprecated help/check are accepted as chat for older clients.
    intent: z
      .enum(['chat', 'help', 'check', 'greet', 'milestone'])
      .default('chat'),
    // Optional display name used to fill a persona greeting's {name} placeholder.
    playerName: z.string().trim().max(60).optional(),
    locale: LocaleSchema.default('en'),
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
  .refine(
    (request) =>
      request.intent === 'greet' ||
      request.intent === 'milestone' ||
      request.message.length > 0,
    {
      path: ['message'],
      message: 'Message is required',
    }
  )
export type InteractRequest = z.infer<typeof InteractRequestSchema>
export const QuestOutcomeSchema = z.enum([
  'offered',
  'progress',
  'completed',
  'incomplete',
])
export const InteractResponseSchema = z
  .object({
    revision: z.number().int().min(0).default(0),
    cached: z.boolean(),
    party: PartySnapshotSchema.nullable(),
    npcId: NpcIdSchema,
    reply: z.string().min(1).max(700),
    source: SourceSchema,
    degraded: z.boolean(),
    friendship: FriendshipMapSchema.default({}),
    friendshipEvents: z.array(FriendshipEventSchema).max(8).default([]),
    world: WorldStateSchema,
    quests: z.array(QuestSchema).max(3),
    questEvents: z.array(QuestEventSchema).max(16),
    toolCalls: z.array(z.string().max(40)).max(8),
  })
  .strict()
export type InteractResponse = z.infer<typeof InteractResponseSchema>

export const GuestPlayerSchema = z.object({
  revision: z.number().int().min(0).default(0),
  friendship: FriendshipMapSchema.default({}),
  id: z.uuid(),
  name: z.string(),
  body: AvatarBodySchema,
  color: z.string(),
  world: WorldStateSchema,
  quests: z.array(QuestSchema).max(3),
  completed: z.array(CompletedQuestSchema),
  reputation: z.number(),
  unlocks: UnlocksSchema.default({ owned: [], equipped: {} }),
})
export type GuestPlayer = z.infer<typeof GuestPlayerSchema>

export const NpcHistorySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        text: z.string(),
        at: z.string(),
        greeting: z.boolean().optional(),
      })
    )
    .max(60),
})
export type NpcHistory = z.infer<typeof NpcHistorySchema>

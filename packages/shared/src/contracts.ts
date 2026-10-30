import { z } from 'zod'

export const NpcIdSchema = z.enum(['hoa', 'tam', 'linh', 'ba'])
export type NpcId = z.infer<typeof NpcIdSchema>
export const LocationIdSchema = z.enum(['market', 'park', 'cathedral', 'river'])
export type LocationId = z.infer<typeof LocationIdSchema>
export const ItemIdSchema = z.enum(['herbs', 'postcard'])
export type ItemId = z.infer<typeof ItemIdSchema>
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
      .array(z.string().regex(/^(herbs|postcard):(hoa|tam|linh|ba)$/))
      .max(32),
    completedQuestIds: z.array(z.string().max(64)).max(32),
    currency: z.number().int().min(0).max(100000),
  })
  .strict()
export type WorldState = z.infer<typeof WorldStateSchema>

export const HistorySchema = z
  .array(
    z
      .object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(500),
      })
      .strict()
  )
  .max(12)
export const RequestBaseSchema = z
  .object({
    sessionId: z.string().regex(/^[a-zA-Z0-9_-]{8,80}$/),
    personaId: NpcIdSchema,
    worldState: WorldStateSchema,
  })
  .strict()
export const ChatRequestSchema = RequestBaseSchema.extend({
  history: HistorySchema.default([]),
  playerText: z.string().trim().min(1).max(500),
})
export type ChatRequest = z.infer<typeof ChatRequestSchema>
export const QuestRequestSchema = RequestBaseSchema.extend({
  context: z.string().max(500).default('I would like to help.'),
  history: HistorySchema.default([]),
  playerText: z.string().max(500).optional(),
})
export type QuestRequest = z.infer<typeof QuestRequestSchema>
export const VerifyRequestSchema = RequestBaseSchema.extend({
  quest: QuestSchema,
  playerClaim: z.string().max(500).default('Please check my progress.'),
})
export type VerifyRequest = z.infer<typeof VerifyRequestSchema>

export const ChatResponseSchema = z
  .object({
    reply: z.string().min(1).max(700),
    mayOfferQuest: z.boolean(),
    source: SourceSchema,
  })
  .strict()
export type ChatResponse = z.infer<typeof ChatResponseSchema>
export const QuestResponseSchema = z
  .object({
    quest: QuestSchema,
    line: z.string().min(1).max(700),
    source: SourceSchema,
  })
  .strict()
export type QuestResponse = z.infer<typeof QuestResponseSchema>
export const VerifyResponseSchema = z
  .object({
    status: z.enum(['COMPLETE', 'INCOMPLETE']),
    reward: RewardSchema,
    line: z.string().min(1).max(700),
    source: SourceSchema,
  })
  .strict()
export type VerifyResponse = z.infer<typeof VerifyResponseSchema>

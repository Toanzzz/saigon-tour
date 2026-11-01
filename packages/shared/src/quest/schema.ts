import { z } from 'zod'
import {
  ItemIdSchema,
  LocationIdSchema,
  MarketItemIdSchema,
  NpcIdSchema,
  RewardSchema,
} from '../entities'

export const QuestStepSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('GO_TO'), locationId: LocationIdSchema }).strict(),
  z.object({ type: z.literal('TALK_TO'), npcId: NpcIdSchema }).strict(),
  z
    .object({
      type: z.literal('DELIVER'),
      itemId: ItemIdSchema,
      npcId: NpcIdSchema,
    })
    .strict(),
  z
    .object({ type: z.literal('BUY'), marketItemId: MarketItemIdSchema })
    .strict(),
])
export type QuestStep = z.infer<typeof QuestStepSchema>

export const QuestSpecSchema = z
  .object({
    giverNpcId: NpcIdSchema,
    title: z.string().trim().min(1).max(80),
    description: z.string().trim().min(1).max(360),
    steps: z.array(QuestStepSchema).min(1).max(3),
    scope: z.enum(['solo', 'party']),
  })
  .strict()
export type QuestSpec = z.infer<typeof QuestSpecSchema>

export const QuestPartySchema = z
  .object({
    id: z.uuid(),
    memberIds: z
      .array(z.uuid())
      .min(2)
      .max(4)
      .refine(
        (ids) => new Set(ids).size === ids.length,
        'Party quest member ids must be unique'
      ),
  })
  .strict()
export type QuestParty = z.infer<typeof QuestPartySchema>

export const QuestSchema = QuestSpecSchema.extend({
  id: z.string().regex(/^q_[a-zA-Z0-9_-]{1,64}$/),
  reward: RewardSchema,
  progress: z.array(z.boolean()).min(1).max(3),
  status: z.enum(['active', 'ready', 'completed']),
  createdAt: z.number().int().min(0),
  party: QuestPartySchema.optional(),
}).strict()
export type Quest = z.infer<typeof QuestSchema>

export const QuestEventSchema = z
  .object({
    type: z.enum(['offered', 'progress', 'completed', 'incomplete']),
    quest: QuestSchema,
    reward: RewardSchema,
  })
  .strict()
export type QuestEvent = z.infer<typeof QuestEventSchema>

export const CompletedQuestSchema = z
  .object({
    id: z.string().regex(/^[a-zA-Z0-9_-]{1,66}$/),
    title: z.string().max(80),
    giverNpcId: NpcIdSchema,
    reward: RewardSchema,
    completedAt: z.number().int().min(0),
  })
  .strict()
export type CompletedQuest = z.infer<typeof CompletedQuestSchema>

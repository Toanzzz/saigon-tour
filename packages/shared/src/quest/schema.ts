import { z } from 'zod'
import {
  ItemIdSchema,
  LocationIdSchema,
  MarketItemIdSchema,
  MilestoneIdSchema,
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
  z
    .object({
      type: z.literal('BRING'),
      itemId: ItemIdSchema,
      npcId: NpcIdSchema,
    })
    .strict(),
])
export type QuestStep = z.infer<typeof QuestStepSchema>

/** Giver's completion punchline. Locale-projected to a plain string. */
const PayoffSchema = z.string().trim().min(1).max(160)

/** Rewrites the final step once every earlier step is done. */
export const TwistSchema = z
  .object({
    step: QuestStepSchema,
    line: z.string().trim().min(1).max(160),
    /** The original final step, captured when the twist applies. */
    replaced: QuestStepSchema.optional(),
  })
  .strict()
export type Twist = z.infer<typeof TwistSchema>

/** Hides step 0 until the city reveals it. */
export const RiddleSchema = z
  .object({ text: z.string().trim().min(1).max(160) })
  .strict()
export type Riddle = z.infer<typeof RiddleSchema>

export const QuestSpecSchema = z
  .object({
    giverNpcId: NpcIdSchema,
    title: z.string().trim().min(1).max(80),
    description: z.string().trim().min(1).max(360),
    steps: z.array(QuestStepSchema).min(1).max(3),
    scope: z.enum(['solo', 'party']),
    payoff: PayoffSchema.optional(),
    twist: TwistSchema.optional(),
    riddle: RiddleSchema.optional(),
    gift: ItemIdSchema.optional(),
    milestone: MilestoneIdSchema.optional(),
  })
  .strict()
export type QuestSpec = z.infer<typeof QuestSpecSchema>

/**
 * Model-facing spec. One explicit step union, the optional authored fields, and
 * a twist without the server-only `replaced`. Phases 0B/0C never touch it.
 */
export const ModelQuestStepSchema = z.discriminatedUnion('type', [
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

export const ModelQuestSpecSchema = z
  .object({
    giverNpcId: NpcIdSchema,
    title: z.string().trim().min(1).max(80),
    description: z.string().trim().min(1).max(360),
    steps: z.array(ModelQuestStepSchema).min(1).max(3),
    scope: z.enum(['solo', 'party']),
    payoff: PayoffSchema.optional(),
    twist: z
      .object({
        step: ModelQuestStepSchema,
        line: z.string().trim().min(1).max(160),
      })
      .strict()
      .optional(),
    riddle: RiddleSchema.optional(),
  })
  .strict()
export type ModelQuestSpec = z.infer<typeof ModelQuestSpecSchema>

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
  /** How a riddle's step 0 was revealed (Phase 3b). */
  revealed: z.enum(['talk', 'cyclo', 'solved']).optional(),
  /** Coins spent on rides while this quest was unfinished (Phase 3d thrift). */
  spent: z.number().int().min(0).optional(),
}).strict()
export type Quest = z.infer<typeof QuestSchema>

export const QuestEventSchema = z
  .object({
    type: z.enum(['offered', 'progress', 'completed', 'incomplete', 'failed']),
    reason: z.enum(['abandoned', 'expired', 'declined']).optional(),
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
    milestone: MilestoneIdSchema.optional(),
  })
  .strict()
export type CompletedQuest = z.infer<typeof CompletedQuestSchema>

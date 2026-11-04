import { z } from 'zod'
import { LocationIdSchema, NeighborIdSchema, NpcIdSchema } from '../entities'
import { RareWearableIdSchema } from '../unlocks/rare'

export const RareOfferSchema = z
  .object({
    id: z.string().min(1).max(80),
    npcId: NeighborIdSchema,
    unlockId: RareWearableIdSchema,
    price: z.number().int().positive(),
    startedAt: z.number().int().min(0),
    endsAt: z.number().int().min(0),
  })
  .strict()
export type RareOffer = z.infer<typeof RareOfferSchema>

export const NpcActivityStateSchema = z
  .object({
    activityId: z.string().min(1).max(40),
    startedAt: z.number().int().min(0),
    endsAt: z.number().int().min(0),
  })
  .strict()

export const CityWeatherSchema = z.enum(['clear', 'rain'])
export const CityEventKindSchema = z.enum([
  'festival',
  'market-rush',
  'rain',
  'street-music',
  'lost-item',
])
export const CityHeadlineSchema = z
  .object({
    id: z.string().min(1).max(80),
    text: z.string().min(1).max(180),
    createdAt: z.number().int().min(0),
  })
  .strict()
export type CityHeadline = z.infer<typeof CityHeadlineSchema>
export const CityEventSchema = z
  .object({
    id: z.string().min(1).max(80),
    kind: CityEventKindSchema,
    locationId: LocationIdSchema,
    title: z.string().min(1).max(80),
    description: z.string().min(1).max(180),
    startedAt: z.number().int().min(0),
    endsAt: z.number().int().min(0),
  })
  .strict()
export type CityEvent = z.infer<typeof CityEventSchema>
export const NpcPlacementSchema = z
  .object({
    locationId: LocationIdSchema,
    anchorId: z.string().min(1).max(40),
    position: z.tuple([z.number(), z.number(), z.number()]),
  })
  .strict()
export type NpcPlacement = z.infer<typeof NpcPlacementSchema>
export const CitySnapshotSchema = z
  .object({
    revision: z.number().int().min(0),
    npcPlacements: z.record(NeighborIdSchema, NpcPlacementSchema),
    events: z.array(CityEventSchema).max(2),
    needs: z.partialRecord(NeighborIdSchema, z.string().min(1).max(180)),
    npcActivities: z
      .partialRecord(NpcIdSchema, NpcActivityStateSchema)
      .default({}),
    weather: CityWeatherSchema,
    headlines: z.array(CityHeadlineSchema).max(12),
    rareOffer: RareOfferSchema.optional(),
  })
  .strict()
export type CitySnapshot = z.infer<typeof CitySnapshotSchema>

export const CityActionSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('start-rare-sale'),
      npcId: NeighborIdSchema,
      unlockId: RareWearableIdSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal('set-npc-activity'),
      npcId: NpcIdSchema,
      activityId: z.string().min(1).max(40),
      durationMs: z.number().int().min(30_000).max(900_000),
    })
    .strict(),
  z
    .object({
      type: z.literal('start-event'),
      kind: CityEventKindSchema,
      locationId: LocationIdSchema,
      title: z.string().min(1).max(80),
      description: z.string().min(1).max(180),
      durationMs: z.number().int().min(30_000).max(900_000),
    })
    .strict(),
  z
    .object({
      type: z.literal('end-event'),
      eventId: z.string().min(1).max(80),
    })
    .strict(),
  z
    .object({
      type: z.literal('move-npc'),
      npcId: NeighborIdSchema,
      locationId: LocationIdSchema,
      anchorId: z.string().min(1).max(40),
    })
    .strict(),
  z
    .object({
      type: z.literal('set-npc-need'),
      npcId: NeighborIdSchema,
      need: z.string().min(1).max(180).nullable(),
    })
    .strict(),
  z
    .object({
      type: z.literal('post-headline'),
      text: z.string().min(1).max(180),
    })
    .strict(),
  z
    .object({
      type: z.literal('set-weather'),
      weather: CityWeatherSchema,
    })
    .strict(),
])
export type CityAction = z.infer<typeof CityActionSchema>

/**
 * A single scheduled beat in the City Director's day plan: a batch of validated
 * city actions to apply at `atMinutes` minutes after the plan was drafted.
 * The director drafts one plan per day from the city snapshot and local news,
 * then applies each beat as its time arrives. Actions still pass the live
 * `CityActionSchema` validator when they fire.
 */
export const CityPlanBeatSchema = z
  .object({
    atMinutes: z.number().int().min(0).max(1440),
    actions: z.array(CityActionSchema).min(1).max(6),
  })
  .strict()
export type CityPlanBeat = z.infer<typeof CityPlanBeatSchema>

/** A full day's worth of director beats, ordered as the model drafted them. */
export const CityDayPlanSchema = z
  .object({
    beats: z.array(CityPlanBeatSchema).min(1).max(24),
  })
  .strict()
export type CityDayPlan = z.infer<typeof CityDayPlanSchema>

import { z } from 'zod'
import { CityHeadlineSchema } from './city/schema'
import {
  CompletedQuestSchema,
  NeighborIdSchema,
  PlayerEventSchema,
  QuestSchema,
  WorldStateSchema,
} from './contracts'
import { PartyInviteSchema, PartySnapshotSchema } from './party'
import { FriendshipMapSchema } from './quest/friendship'
import { AvatarBodySchema, LookSchema, UnlocksSchema } from './unlocks'

export const WORLD_BOUNDS = { x: [-110, 150], z: [-120, 100] } as const
export const NPC_POSITIONS = {
  hoa: [-23, 0, 3.5],
  tam: [-12, 0, 10],
  linh: [24, 0, -5],
  ba: [23, 0, 29],
  mai: [-30, 0, 8],
  alex: [92, 0, -38],
  vy: [64, 0, -18],
  son: [103, 0, -78],
  thao: [94, 0, -31],
} satisfies Record<z.infer<typeof NeighborIdSchema>, [number, number, number]>
export const EmoteSchema = z.enum(['wave', 'thanks', 'hello', 'follow-me'])
export type Emote = z.infer<typeof EmoteSchema>
export const PositionSchema = z.tuple([
  z.number().min(-110).max(150),
  z.number().min(-5).max(20),
  z.number().min(-120).max(100),
])
export const PresencePlayerSchema = z.object({
  id: z.uuid(),
  name: z.string().max(80),
  body: AvatarBodySchema,
  color: z.string().max(20),
  position: PositionSchema,
  heading: z.number(),
  ride: z.string().max(20).nullable(),
  look: LookSchema.nullable().default(null),
})
export type PresencePlayer = z.infer<typeof PresencePlayerSchema>
export const ClientSocketMessageSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('state'),
      position: PositionSchema,
      heading: z.number(),
      ride: z.string().max(20).nullable(),
    })
    .strict(),
  z
    .object({
      type: z.literal('events'),
      sequence: z.number().int().min(1),
      events: z
        .array(PlayerEventSchema)
        .min(1)
        .max(16)
        .refine((events) => events.every((event) => event.type !== 'deliver')),
    })
    .strict(),
  z.object({ type: z.literal('emote'), emote: EmoteSchema }).strict(),
  z.object({ type: z.literal('party-invite'), targetId: z.uuid() }).strict(),
  z
    .object({
      type: z.literal('party-respond'),
      inviteId: z.uuid(),
      accept: z.boolean(),
    })
    .strict(),
  z.object({ type: z.literal('party-leave') }).strict(),
])
export type ClientSocketMessage = z.infer<typeof ClientSocketMessageSchema>
export type ClientMessageType = ClientSocketMessage['type']
export type PartyClientMessage = Extract<
  ClientSocketMessage,
  { type: 'party-invite' | 'party-respond' | 'party-leave' }
>
export const ServerSocketMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('city-headline'), headline: CityHeadlineSchema }),
  z.object({
    type: z.literal('welcome'),
    selfId: z.uuid(),
    room: z.string(),
  }),
  z.object({
    type: z.literal('emote'),
    playerId: z.uuid(),
    emote: EmoteSchema,
  }),
  z.object({
    type: z.literal('npc-line'),
    npcId: NeighborIdSchema,
    reply: z.string().max(700),
  }),
  z.object({
    type: z.literal('world'),
    revision: z.number().int().min(0).default(0),
    sequence: z.number().int().min(0),
    world: WorldStateSchema,
    quests: z.array(QuestSchema).max(3),
    completed: z.array(CompletedQuestSchema),
    reputation: z.number(),
    friendship: FriendshipMapSchema.default({}),
    unlocks: UnlocksSchema.default({ owned: [], equipped: {} }),
  }),
  z.object({ type: z.literal('error'), message: z.string() }),
  z.object({ type: z.literal('party'), party: PartySnapshotSchema.nullable() }),
  PartyInviteSchema.extend({ type: z.literal('party-invited') }),
  z.object({
    type: z.literal('quest-completed'),
    revision: z.number().int().min(0).default(0),
    quest: QuestSchema,
    quests: z.array(QuestSchema).max(3),
    world: WorldStateSchema,
    completed: z.array(CompletedQuestSchema),
    reputation: z.number(),
    friendship: FriendshipMapSchema.default({}),
    unlocks: UnlocksSchema.default({ owned: [], equipped: {} }),
  }),
])
export type ServerSocketMessage = z.infer<typeof ServerSocketMessageSchema>

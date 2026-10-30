import { z } from 'zod'
import {
  NpcIdSchema,
  PlayerEventSchema,
  QuestSchema,
  WorldStateSchema,
} from './contracts'
import { PartyInviteSchema, PartySnapshotSchema } from './party'

export const WORLD_BOUNDS = { x: [-110, 150], z: [-120, 100] } as const
export const NPC_POSITIONS = {
  hoa: [-23, 0, 3.5],
  tam: [-12, 0, 10],
  linh: [24, 0, -5],
  ba: [23, 0, 29],
  mai: [-30, 0, 18],
  alex: [92, 0, -38],
} satisfies Record<z.infer<typeof NpcIdSchema>, [number, number, number]>
export const EmoteSchema = z.enum(['wave', 'thanks', 'hello', 'follow-me'])
export type Emote = z.infer<typeof EmoteSchema>
export const PositionSchema = z.tuple([
  z.number().finite().min(-110).max(150),
  z.number().finite().min(-5).max(20),
  z.number().finite().min(-120).max(100),
])
export const PresencePlayerSchema = z.object({
  id: z.uuid(),
  name: z.string().max(80),
  color: z.string().max(20),
  position: PositionSchema,
  heading: z.number().finite(),
  ride: z.string().max(20).nullable(),
})
export type PresencePlayer = z.infer<typeof PresencePlayerSchema>
export const ClientSocketMessageSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('hello'),
      token: z.string().min(1).max(128),
      protocol: z.literal(1),
    })
    .strict(),
  z
    .object({
      type: z.literal('state'),
      position: PositionSchema,
      heading: z.number().finite(),
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
export const ServerSocketMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('welcome'),
    selfId: z.uuid(),
    room: z.string(),
    players: z.array(PresencePlayerSchema),
  }),
  z.object({ type: z.literal('player-joined'), player: PresencePlayerSchema }),
  z.object({ type: z.literal('player-left'), playerId: z.uuid() }),
  z.object({
    type: z.literal('players'),
    players: z.array(PresencePlayerSchema),
  }),
  z.object({
    type: z.literal('emote'),
    playerId: z.uuid(),
    emote: EmoteSchema,
  }),
  z.object({
    type: z.literal('npc-line'),
    npcId: NpcIdSchema,
    reply: z.string().max(700),
  }),
  z.object({
    type: z.literal('world'),
    revision: z.number().int().min(0).default(0),
    sequence: z.number().int().min(0),
    world: WorldStateSchema,
    quest: QuestSchema.nullable(),
    completed: z.array(QuestSchema),
    reputation: z.number(),
  }),
  z.object({ type: z.literal('error'), message: z.string() }),
  z.object({ type: z.literal('party'), party: PartySnapshotSchema.nullable() }),
  PartyInviteSchema.extend({ type: z.literal('party-invited') }),
  z.object({
    type: z.literal('quest-completed'),
    revision: z.number().int().min(0).default(0),
    quest: QuestSchema,
    world: WorldStateSchema,
    completed: z.array(QuestSchema),
    reputation: z.number(),
  }),
])
export type ServerSocketMessage = z.infer<typeof ServerSocketMessageSchema>

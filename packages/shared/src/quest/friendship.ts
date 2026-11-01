import { z } from 'zod'
import { type NpcId, NpcIdSchema } from '../entities'
import { NPCS } from '../world'
import type { Quest } from './schema'

export const FRIENDSHIP_MIN = -5
export const FRIENDSHIP_MAX = 5
export const CHAT_FRIENDSHIP_MAX = 3
export const CHAT_COOLDOWN_MS = 3 * 60_000
export const QUEST_EXPIRY_MS = 20 * 60_000
export const FriendshipMapSchema = z.partialRecord(
  NpcIdSchema,
  z.object({
    level: z.number().int().min(-5).max(5),
    chatAt: z.number().optional(),
  })
)
export type FriendshipMap = z.infer<typeof FriendshipMapSchema>
export const FriendshipEventSchema = z.object({
  npcId: NpcIdSchema,
  delta: z.number().int().min(-1).max(1),
  level: z.number().int().min(-5).max(5),
  reason: z.enum(['chat', 'completed', 'abandoned', 'expired', 'declined']),
})
export type FriendshipEvent = z.infer<typeof FriendshipEventSchema>
export function friendlinessOf(map: FriendshipMap, npcId: NpcId) {
  return map[npcId]?.level ?? NPCS[npcId].friendliness
}
export function shiftFriendship(
  map: FriendshipMap,
  npcId: NpcId,
  delta: number
) {
  const level = Math.max(
    FRIENDSHIP_MIN,
    Math.min(FRIENDSHIP_MAX, friendlinessOf(map, npcId) + delta)
  )
  return { ...map, [npcId]: { ...map[npcId], level } }
}
export const canOfferQuests = (map: FriendshipMap, npcId: NpcId) =>
  friendlinessOf(map, npcId) > -3
export const isExpired = (quest: Quest, now = Date.now()) =>
  quest.status === 'active' && now - quest.createdAt >= QUEST_EXPIRY_MS
export const looksLikeHelpRequest = (message: string) =>
  /\b(help|errands?|tasks?|favou?rs?)\b|giúp|việc/iu.test(message)

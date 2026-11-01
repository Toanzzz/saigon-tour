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
/**
 * Join/participation intent, e.g. "let me join", "count me in", "I want to take
 * part", or Vietnamese "cho tôi tham gia". A player who asks to join an event is
 * asking for something to do, so it routes into the same errand-offer flow.
 */
export const looksLikeJoinRequest = (message: string) =>
  /\b(join|joining|take part|taking part|participate|participating|sign (?:me )?up|count me in|i'?m in|let me in|how (?:can|do) i (?:join|help|take part))\b|tham gia|cho (?:tôi|minh|mình) (?:tham gia|vào)|(?:muốn|cho) vào/iu.test(
    message
  )
/** True when the player is asking for something to do (help or join an event). */
export const wantsErrand = (message: string) =>
  looksLikeHelpRequest(message) || looksLikeJoinRequest(message)

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

/** Coarse affinity tiers used to precompute a small set of greetings per NPC. */
export const AFFINITY_TIERS = [
  'hostile',
  'guarded',
  'neutral',
  'warm',
  'close',
] as const
export type AffinityTier = (typeof AFFINITY_TIERS)[number]

/** Map a -5..+5 friendliness level onto a coarse greeting tier. */
export function affinityTier(level: number): AffinityTier {
  if (level <= -3) return 'hostile'
  if (level < 0) return 'guarded'
  if (level === 0) return 'neutral'
  if (level >= 3) return 'close'
  return 'warm'
}

/** A representative level for a tier, used when precomputing greetings. */
export const TIER_LEVEL: Record<AffinityTier, number> = {
  hostile: -5,
  guarded: -1,
  neutral: 0,
  warm: 1,
  close: 5,
}

/** Placeholder a persona greeting may carry to be filled with the player name. */
export const NAME_PLACEHOLDER = '{name}'

/**
 * The player referred to the NPC's prepared greeting or the event it mentioned,
 * so the opener should enter this conversation turn as context.
 */
export const refersToGreeting = (message: string) =>
  /\b(greet(?:ing|ed)?|you said|you mentioned|earlier|hello|hi there|you told me|gathering|event|festival|happening|welcome)\b|chào|vừa nói|lúc nãy|hồi nãy|sự kiện|lễ hội|đang diễn ra/iu.test(
    message
  )

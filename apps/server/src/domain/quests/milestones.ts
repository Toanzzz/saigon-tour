import {
  isMilestoneFinale,
  type Locale,
  MILESTONES,
  type MilestoneId,
  milestoneForGiver,
  milestoneReady,
  milestoneSeeds,
  type NpcId,
  type Quest,
  type QuestSpec,
} from '@saigon/shared'
import type { QuestService } from './service'

export interface MilestoneOffer {
  offered: boolean
  reason?: string
  title?: string
  description?: string
  quest?: Quest
}

/** The milestone a player has already completed, from the completed ledger. */
function completedMilestones(
  completed: { giverNpcId: NpcId; milestone?: MilestoneId }[]
) {
  return new Set(
    completed.filter(isMilestoneFinale).map((entry) => entry.milestone)
  )
}

/** A giver's single milestone seed, projected to the locale. */
function milestoneSeed(npcId: NpcId, locale: Locale): QuestSpec | null {
  return milestoneSeeds(npcId, locale)[0] ?? null
}

/**
 * Offer the giver's milestone errand when the NPC gives a component the player
 * lacks, the player has no active milestone quest from this NPC, and the
 * milestone is not yet completed. Surfaces `proposeQuest` outcomes (cap, etc.).
 */
export async function offerMilestone(
  game: QuestService,
  playerId: string,
  npcId: NpcId,
  locale: Locale = 'en'
): Promise<MilestoneOffer> {
  const milestoneId = milestoneForGiver(npcId)
  if (!milestoneId) return { offered: false, reason: 'not_a_giver' }
  const component = MILESTONES[milestoneId].components.find(
    (entry) => entry.giver === npcId
  )
  if (!component) return { offered: false, reason: 'not_a_giver' }
  const record = await game.get(playerId)
  if (completedMilestones(record.completed).has(milestoneId))
    return { offered: false, reason: 'milestone_completed' }
  if ((record.world.inventory[component.itemId] ?? 0) > 0)
    return { offered: false, reason: 'already_holds_component' }
  if (
    record.quests.some(
      (quest) =>
        quest.giverNpcId === npcId &&
        quest.milestone === milestoneId &&
        quest.status !== 'completed'
    )
  )
    return { offered: false, reason: 'already_active' }
  const seed = milestoneSeed(npcId, locale)
  if (!seed) return { offered: false, reason: 'no_seed' }
  const result = await game.proposeQuest(playerId, npcId, seed)
  if (!result.accepted) return { offered: false, reason: result.reason }
  return {
    offered: true,
    title: seed.title,
    description: seed.description,
    quest: result.quest,
  }
}

/**
 * Offer the apex to the host when the player holds every component, no apex is
 * active, and the milestone is not completed. Runs on every host interaction.
 */
export async function offerApex(
  game: QuestService,
  playerId: string,
  npcId: NpcId,
  locale: Locale = 'en'
): Promise<MilestoneOffer> {
  const milestoneId = hostedMilestone(npcId)
  if (!milestoneId) return { offered: false, reason: 'not_host' }
  const record = await game.get(playerId)
  if (completedMilestones(record.completed).has(milestoneId))
    return { offered: false, reason: 'milestone_completed' }
  if (!milestoneReady(record.world, milestoneId))
    return { offered: false, reason: 'components_missing' }
  if (
    record.quests.some(
      (quest) =>
        quest.giverNpcId === npcId &&
        quest.milestone === milestoneId &&
        quest.status !== 'completed'
    )
  )
    return { offered: false, reason: 'apex_active' }
  const seed = milestoneSeed(npcId, locale)
  if (!seed) return { offered: false, reason: 'no_seed' }
  const result = await game.proposeQuest(playerId, npcId, seed)
  if (!result.accepted) return { offered: false, reason: result.reason }
  return {
    offered: true,
    title: seed.title,
    description: seed.description,
    quest: result.quest,
  }
}

/** The milestone this NPC hosts (apex giver), if any. */
export function hostedMilestone(npcId: NpcId): MilestoneId | null {
  for (const [id, milestone] of Object.entries(MILESTONES) as [
    MilestoneId,
    (typeof MILESTONES)[MilestoneId],
  ][])
    if (milestone.host === npcId) return id
  return null
}

/** Per-room cooldown: at most one milestone event per room every 10 minutes. */
export const MILESTONE_COOLDOWN_MS = 600_000

/**
 * Record a milestone event for a room and report whether it is allowed now.
 * Later completers within the window still get their reward; only the room
 * event is throttled.
 */
export function allowMilestoneEvent(
  lastByRoom: Map<string, number>,
  roomId: string,
  now: number
): boolean {
  const last = lastByRoom.get(roomId)
  if (last !== undefined && now - last < MILESTONE_COOLDOWN_MS) return false
  lastByRoom.set(roomId, now)
  return true
}

/** Minimal city surface the concert sequence needs; CityWorld satisfies it. */
export interface ConcertCity {
  snapshot(): { events: { id: string; endsAt: number }[] }
  apply(action: unknown): unknown
}

/**
 * Run the milestone room-event sequence against a room's city:
 * free a slot (end the soonest event when both are full), start the concert,
 * move Thảo to the City Hall gathering anchor, and post the headline. `who`
 * must already be a safety-checked name or the neutral fallback.
 */
export function runConcertSequence(
  city: ConcertCity,
  milestoneId: MilestoneId,
  who: string
): void {
  const milestone = MILESTONES[milestoneId]
  const snapshot = city.snapshot()
  if (snapshot.events.length >= 2) {
    const soonest = [...snapshot.events].sort((a, b) => a.endsAt - b.endsAt)[0]
    if (soonest) city.apply({ type: 'end-event', eventId: soonest.id })
  }
  city.apply({
    type: 'start-event',
    kind: milestone.event.kind,
    locationId: milestone.locationId,
    title: milestone.event.title.en,
    description: milestone.event.description.en,
    durationMs: milestone.event.durationMs,
  })
  city.apply({
    type: 'move-npc',
    npcId: 'thao',
    locationId: milestone.locationId,
    anchorId: 'gathering',
  })
  city.apply({
    type: 'post-headline',
    text: `${who} brought the evening concert to City Hall!`,
  })
}

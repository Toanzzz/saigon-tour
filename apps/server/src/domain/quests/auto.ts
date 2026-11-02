import {
  hasDemoSeed,
  type InteractRequest,
  type NpcId,
  type Quest,
  type QuestSpec,
  seedsFor,
  wantsErrand,
} from '@saigon/shared'
import type { ToolOutcome } from './outcome'
import type { QuestService } from './service'

/**
 * Seed titles (en + vi) this giver completed in its last 3 quests. Used to vary
 * the deterministic fallback so a just-finished seed is not re-offered first.
 */
function recentTitles(
  completed: { title: string; giverNpcId: NpcId }[],
  npcId: NpcId
): Set<string> {
  return new Set(
    completed
      .filter((entry) => entry.giverNpcId === npcId)
      .slice(-3)
      .map((entry) => entry.title)
  )
}

/** A seed is "recent" when either locale's title was just completed. */
function isRecent(npcId: NpcId, spec: QuestSpec, recent: Set<string>): boolean {
  if (recent.has(spec.title)) return true
  const signature = JSON.stringify(spec.steps)
  const vi = seedsFor(npcId, 'vi').find(
    (other) =>
      JSON.stringify(other.steps) === signature && other.scope === spec.scope
  )
  return vi ? recent.has(vi.title) : false
}

export async function offerSeed(
  game: QuestService,
  npcId: NpcId,
  request: InteractRequest,
  playerId: string,
  outcome: ToolOutcome
) {
  const before = outcome.events.length
  if (
    wantsErrand(request.message) &&
    !outcome.events.some((e) => e.type === 'offered')
  ) {
    const record = await game.get(playerId)
    const recent = recentTitles(record.completed, npcId)
    const seeds = seedsFor(npcId, request.locale, { demo: request.demo })
    // Prefer the first valid seed whose title is not among the last 3
    // completed; fall back to the original order if every seed is recent.
    const order = [
      ...seeds.filter((spec) => !isRecent(npcId, spec, recent)),
      ...seeds.filter((spec) => isRecent(npcId, spec, recent)),
    ]
    for (const spec of order) {
      outcome.calls.push('propose-quest')
      const scope =
        (game.party?.snapshot(playerId)?.members.length ?? 0) >= 2
          ? 'party'
          : 'solo'
      const result = await game.proposeQuest(playerId, npcId, {
        ...spec,
        scope,
      })
      if (result.accepted) {
        outcome.events.push({
          type: 'offered',
          quest: result.quest,
          reward: result.quest.reward,
        })
        break
      }
    }
  }
  return outcome.events.length > before
}

/**
 * `?demo` recording path: before any model call, offer the giver's demo-ordered
 * seed so the take is identical live, slow, or offline. Only applies to NPCs
 * with an authored demo seed and when the giver has no errand in progress.
 * Returns the offered quest, or null to fall through to the normal turn.
 */
export async function offerDemoSeed(
  game: QuestService,
  npcId: NpcId,
  request: InteractRequest,
  playerId: string,
  outcome: ToolOutcome
): Promise<Quest | null> {
  if (!request.demo || !hasDemoSeed(npcId) || !wantsErrand(request.message))
    return null
  const record = await game.get(playerId)
  if (
    record.quests.some(
      (quest) => quest.giverNpcId === npcId && quest.status !== 'completed'
    )
  )
    return null
  const before = outcome.events.length
  if (!(await offerSeed(game, npcId, request, playerId, outcome))) return null
  const offered = outcome.events
    .slice(before)
    .find((event) => event.type === 'offered')
  return offered?.quest ?? null
}

export const outcomeKind = (outcome: ToolOutcome) =>
  outcome.events.some((e) => e.type === 'completed')
    ? 'completed'
    : outcome.events.some((e) => e.type === 'offered')
      ? 'offered'
      : outcome.events.some((e) => e.type === 'incomplete')
        ? 'incomplete'
        : outcome.events.some((e) => e.type === 'failed')
          ? 'failed'
          : null

export async function completeReady(
  game: QuestService,
  playerId: string,
  npcId: NpcId
) {
  const record = await game.get(playerId)
  if (
    !record.quests.some(
      (quest) => quest.giverNpcId === npcId && quest.status === 'ready'
    )
  )
    return []
  return (await game.checkQuests(playerId, npcId)).filter(
    (event) => event.type === 'completed'
  )
}

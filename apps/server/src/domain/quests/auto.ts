import {
  type InteractRequest,
  type NpcId,
  seedsFor,
  wantsErrand,
} from '@saigon/shared'
import type { ToolOutcome } from './outcome'
import type { QuestService } from './service'

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
    for (const spec of seedsFor(npcId, request.locale)) {
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

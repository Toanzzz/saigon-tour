import { type InteractRequest, type NpcId, seedsFor } from '@saigon/shared'
import type { ToolOutcome } from './outcome'
import type { QuestService } from './service'

export async function runIntent(
  game: QuestService,
  npcId: NpcId,
  request: InteractRequest,
  playerId: string,
  outcome: ToolOutcome
) {
  const before = outcome.events.length
  if (
    request.intent === 'help' &&
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
  if (request.intent === 'check') {
    outcome.calls.push('check-quests')
    outcome.events.push(...(await game.checkQuests(playerId, npcId)))
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
        : null

import type { InteractRequest, NpcId } from '@saigon/shared'
import type { ToolOutcome } from './outcome'
import { secretQuestFor } from './quests'
import type { GameService } from './state'
import { runTeamIntent } from './team'

/** Explicit controls use the same validated methods as the NPC tools. */
export async function runIntent(
  game: GameService,
  npcId: NpcId,
  request: InteractRequest,
  playerId: string,
  outcome: ToolOutcome
) {
  if (request.intent === 'team') {
    await runTeamIntent(game, npcId, playerId, outcome)
    return true
  }
  const record = await game.get(playerId)
  const before = outcomeKind(outcome)
  if (request.intent === 'help' && outcome.offered) return false
  if (request.intent === 'check' && (outcome.completed || outcome.incomplete))
    return false
  if (request.intent === 'help' && !record.quest) {
    const quest = secretQuestFor(npcId)
    if (quest) {
      outcome.calls.push('offer-quest')
      const result = await game.offerQuest(playerId, npcId, quest.id)
      if (result.accepted) outcome.offered = result.quest
    }
  }
  if (request.intent === 'check' && record.quest?.giverNpcId === npcId) {
    outcome.calls.push('check-quest')
    const quest = record.quest
    const result = await game.checkQuest(playerId, npcId, quest.id)
    if (result.rewardGranted)
      outcome.completed = { quest, reward: result.reward }
    else if (result.status === 'active') outcome.incomplete = quest
  }
  return outcomeKind(outcome) !== before
}

export const outcomeKind = (outcome: ToolOutcome) =>
  outcome.completed
    ? 'completed'
    : outcome.offered
      ? 'offered'
      : outcome.incomplete
        ? 'incomplete'
        : null

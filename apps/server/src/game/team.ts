import { type NpcId, TEAM_QUEST } from '@saigon/shared'
import type { ToolOutcome } from '../npc/tools/context'
import type { GameService } from './state'

export async function runTeamIntent(
  game: GameService,
  npcId: NpcId,
  playerId: string,
  outcome: ToolOutcome
) {
  if (npcId !== 'hoa') return
  const party = game.team?.snapshot(playerId)
  if (party?.quest) {
    outcome.calls.push('check-quest')
    const result = await game.checkQuest(playerId, npcId, TEAM_QUEST.id)
    const quest = result.quest ?? structuredClone(TEAM_QUEST)
    if (result.rewardGranted)
      outcome.completed = { quest, reward: result.reward }
    else if (result.status === 'active') outcome.incomplete = quest
  } else {
    outcome.calls.push('offer-quest')
    const result = await game.offerQuest(playerId, npcId, TEAM_QUEST.id)
    if (result.accepted) outcome.offered = result.quest
  }
}

export function teamReply(
  game: GameService,
  playerId: string,
  outcome: ToolOutcome
) {
  const party = game.team?.snapshot(playerId)
  if (outcome.completed)
    return 'Cảm ơn cả nhóm! Lunch has arrived. Each teammate has 40 coins and a photo to remember today.'
  if (party?.quest?.completed)
    return 'The team lunch is complete. Cảm ơn! Your thank-you has already been given.'
  if (outcome.offered)
    return 'Cả nhóm, let’s help with lunch! Each of you has a dish for Chị Linh in the park. Bring every dish, then check with me.'
  if (outcome.incomplete)
    return 'Chị Linh is still waiting for the whole lunch. Every assigned teammate needs to hand her their own dish.'
  if (!party || party.members.length < 2)
    return 'Bring a friend and form a party of at least two, then we can carry lunch together.'
  return 'This team cannot take the lunch errand again once a member has completed it.'
}

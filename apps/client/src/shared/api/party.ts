import {
  applyPlayerEvents,
  type PartySnapshot,
  type Quest,
  type ServerSocketMessage,
  TEAM_QUEST,
} from '@saigon/shared'
import { type GameState, game } from '@/shared/state/game'
import { currentEventBatch } from './events'
import { net, updateNet } from './status'

export function teamObjective(
  party: PartySnapshot | null,
  selfId: string | null
) {
  const quest = party?.quest
  if (!quest || quest.completed) return null
  const assignment = quest.assignments.find(
    (entry) => entry.playerId === selfId
  )
  const delivered = quest.assignments.filter((entry) => entry.delivered).length
  const total = quest.assignments.length
  return {
    title: TEAM_QUEST.title,
    hint:
      delivered === total
        ? 'Check team errand with Cô Hoa at the market.'
        : assignment && !assignment.delivered
          ? `Bring the ${assignment.dish} to Chị Linh in the park.`
          : 'Your dish arrived. Cheer your teammates on!',
    progress: `${delivered}/${total} dishes delivered`,
  }
}

export function rewardCopy(quest: Quest | null) {
  return quest?.id === TEAM_QUEST.id
    ? 'Your team brought lunch to Chị Linh. Cô Hoa thanks every helping hand.'
    : 'The herbs made it to Chị Linh’s community lunch. Cô Hoa sends her thanks.'
}

export function completedQuest(
  state: GameState,
  message: Extract<ServerSocketMessage, { type: 'quest-completed' }>
): GameState {
  if (message.revision < state.serverRevision) return state
  const alreadySeen = state.completed.some(
    (quest) => quest.id === message.quest.id
  )
  return {
    ...state,
    serverRevision: message.revision,
    world: applyPlayerEvents(message.world, [
      ...(currentEventBatch()?.events ?? []),
      ...state.pending,
    ]),
    completed: message.completed,
    reputation: message.reputation,
    ...(alreadySeen
      ? {}
      : {
          reward: message.quest.reward.currency,
          rewardQuest: message.quest,
          screen: 'playing' as const,
          panel: 'reward' as const,
          dialogue: null,
        }),
  }
}

export function handlePartyMessage(message: ServerSocketMessage) {
  if (message.type === 'party')
    updateNet({
      partyVersion: net.state.partyVersion + 1,
      party: message.party,
      ...(message.party ? { invite: null } : {}),
    })
  else if (message.type === 'party-invited') updateNet({ invite: message })
  else if (message.type === 'quest-completed') {
    updateNet({ partyVersion: net.state.partyVersion + 1 })
    game.setState((state) => completedQuest(state, message))
  }
}

export function clearExpiredInvite(now = Date.now()) {
  if (net.state.invite && net.state.invite.expiresAt <= now)
    updateNet({ invite: null })
}

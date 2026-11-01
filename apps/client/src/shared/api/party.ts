import {
  applyQuestEvents,
  type Quest,
  type ServerSocketMessage,
} from '@saigon/shared'
import { type GameState, game } from '@/shared/state/game'
import { currentEventBatch } from './events'
import { net, updateNet } from './status'

export function rewardCopy(quest: Quest | null) {
  return quest
    ? `You completed “${quest.title}”. Your neighbor sends a heartfelt thank-you.`
    : 'A neighbor sends a heartfelt thank-you for your help.'
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
    ...applyQuestEvents(message.world, message.quests, [
      ...(currentEventBatch()?.events ?? []),
      ...state.pending,
    ]),
    trackedQuestId: message.quests.some(
      (quest) => quest.id === state.trackedQuestId
    )
      ? state.trackedQuestId
      : (message.quests[0]?.id ?? null),
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

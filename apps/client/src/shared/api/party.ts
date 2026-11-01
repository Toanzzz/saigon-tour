import {
  applyQuestEvents,
  type Quest,
  type ServerSocketMessage,
} from '@saigon/shared'
import { m } from '@/shared/i18n'
import { noteFriendship } from '@/shared/state/friendship'
import { type GameState, game } from '@/shared/state/game'
import { currentEventBatch } from './events'
import { net, updateNet } from './status'

export function rewardCopy(quest: Quest | null) {
  return quest ? m.reward_completed({ title: quest.title }) : m.reward_generic()
}

export function completedQuest(
  state: GameState,
  message: Extract<ServerSocketMessage, { type: 'quest-completed' }>
): GameState {
  if (message.revision < state.serverRevision) return state
  const unseen = message.completed.filter(
    (quest) => !state.completed.some((entry) => entry.id === quest.id)
  )
  const alreadySeen = state.completed.some(
    (quest) => quest.id === message.quest.id
  )
  return {
    ...state,
    friendship: message.friendship,
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
          reward:
            unseen.reduce((total, quest) => total + quest.reward.currency, 0) ||
            message.quest.reward.currency,
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
    if (message.revision >= game.state.serverRevision)
      noteFriendship(game.state.friendship, message.friendship)
    updateNet({ partyVersion: net.state.partyVersion + 1 })
    game.setState((state) => completedQuest(state, message))
  }
}

export function clearExpiredInvite(now = Date.now()) {
  if (net.state.invite && net.state.invite.expiresAt <= now)
    updateNet({ invite: null })
}

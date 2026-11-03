import {
  applyQuestEvents,
  completionLine,
  type Quest,
  type ServerSocketMessage,
} from '@saigon/shared'
import { audio } from '@/shared/audio'
import { getLocale, m } from '@/shared/i18n'
import { completionQuest, queueCompletions } from '@/shared/state/completions'
import { noteFriendship } from '@/shared/state/friendship'
import { celebrate, type GameState, game } from '@/shared/state/game'
import { currentEventBatch } from './events'
import { net, updateNet } from './status'

export function rewardCopy(quest: Quest | null) {
  return quest ? completionLine(quest, getLocale()) : m.reward_generic()
}

export function completedQuest(
  state: GameState,
  message: Extract<ServerSocketMessage, { type: 'quest-completed' }>
): GameState {
  if (message.revision < state.serverRevision) {
    return state.rewardQueue.some((quest) => quest.id === message.quest.id)
      ? { ...state, ...queueCompletions(state, [message.quest]) }
      : state
  }
  const unseen = message.completed.filter(
    (quest) => !state.completed.some((entry) => entry.id === quest.id)
  )
  const cards = unseen.map((quest) =>
    quest.id === message.quest.id ? message.quest : completionQuest(quest)
  )
  // Upgrade an already queued summary when its full notification arrives.
  if (state.rewardQueue.some((quest) => quest.id === message.quest.id))
    cards.push(message.quest)
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
    unlocks: message.unlocks,
    ...queueCompletions(state, cards),
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
    const fresh =
      message.revision >= game.state.serverRevision &&
      message.completed.some(
        (quest) => !game.state.completed.some((entry) => entry.id === quest.id)
      )
    if (message.revision >= game.state.serverRevision)
      noteFriendship(game.state.friendship, message.friendship)
    updateNet({ partyVersion: net.state.partyVersion + 1 })
    game.setState((state) => completedQuest(state, message))
    if (fresh) {
      audio.play('reward')
      celebrate('completed')
    }
  }
}

export function clearExpiredInvite(now = Date.now()) {
  if (net.state.invite && net.state.invite.expiresAt <= now)
    updateNet({ invite: null })
}

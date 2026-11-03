import {
  applyQuestEvents,
  type InteractResponse,
  isMilestoneFinale,
  type NpcId,
} from '@saigon/shared'
import { net, updateNet } from '@/shared/api/status'
import { audio } from '@/shared/audio'
import { m } from '@/shared/i18n'
import { queueCompletions, queuedDetails } from '@/shared/state/completions'
import { noteFriendship } from '@/shared/state/friendship'
import {
  type ChatMessage,
  celebrate,
  type GameState,
  game,
  notify,
} from '@/shared/state/game'

export function applyResponse(
  result: InteractResponse,
  npc: NpcId,
  history: ChatMessage[],
  requestId: string,
  synced: boolean,
  partyVersion: number
) {
  if (result.revision >= game.state.serverRevision)
    noteFriendship(
      game.state.friendship,
      result.friendship,
      result.friendshipEvents
    )
  for (const event of result.questEvents)
    if (event.type === 'failed')
      notify(m.quest_failed({ title: event.quest.title }))
  const events = result.questEvents
  if (synced && net.state.partyVersion === partyVersion)
    updateNet({ party: result.party })
  let offered = false
  let completed = false
  let milestoneBegan = false
  game.setState((state) => {
    const pendingDetails = queuedDetails(state, events)
    if (result.revision < state.serverRevision) {
      return state.dialogue?.requestId === requestId
        ? {
            ...state,
            ...queueCompletions(state, pendingDetails),
            dialogue: {
              ...state.dialogue,
              thinking: false,
              streamingText: undefined,
            },
          }
        : pendingDetails.length
          ? { ...state, ...queueCompletions(state, pendingDetails) }
          : state
    }
    let next: GameState = {
      ...state,
      ...queueCompletions(state, pendingDetails),
      friendship: result.friendship,
      serverRevision: synced ? result.revision : state.serverRevision,
      ...applyQuestEvents(result.world, result.quests, state.pending),
      trackedQuestId: result.quests.some(
        (quest) => quest.id === state.trackedQuestId
      )
        ? state.trackedQuestId
        : (result.quests[0]?.id ?? null),
      source: result.source,
      lastLine: result.reply
        ? { ...state.lastLine, [npc]: result.reply }
        : state.lastLine,
    }
    offered = events.some(
      (event) =>
        event.type === 'offered' &&
        !state.quests.some((quest) => quest.id === event.quest.id)
    )
    const rewards = events.filter(
      (event) =>
        event.type === 'completed' &&
        !state.completed.some((quest) => quest.id === event.quest.id)
    )
    if (rewards.length) {
      completed = true
      milestoneBegan = rewards.some((entry) => isMilestoneFinale(entry.quest))
      const owned = new Set(state.unlocks.owned)
      for (const entry of rewards)
        if (entry.reward.unlockId) owned.add(entry.reward.unlockId)
      next = {
        ...next,
        unlocks: { ...state.unlocks, owned: [...owned] },
        completed: [
          ...state.completed,
          ...rewards.map(({ quest, reward }) => ({
            id: quest.id,
            title: quest.title,
            giverNpcId: quest.giverNpcId,
            reward,
            completedAt: Date.now(),
            ...(quest.milestone ? { milestone: quest.milestone } : {}),
          })),
        ],
        reputation:
          state.reputation +
          rewards.reduce((total, entry) => total + entry.reward.reputation, 0),
        ...queueCompletions(
          next,
          rewards.map((entry) => entry.quest)
        ),
      }
      return next
    }
    return {
      ...next,
      dialogue:
        state.dialogue?.requestId === requestId
          ? {
              ...state.dialogue,
              thinking: false,
              streamingText: undefined,
              source: result.source,
              history: history.slice(-30),
              earlierCount: Math.max(
                0,
                (state.dialogue.earlierCount ?? 0) -
                  Math.max(0, history.length - 30)
              ),
            }
          : state.dialogue,
    }
  })
  if (offered) {
    audio.play('accept')
    celebrate('accepted')
    notify(m.toast_errand_added())
  }
  if (completed) {
    audio.play('reward')
    celebrate('completed')
  }
  if (milestoneBegan) notify(m.milestone_begins_toast())
}

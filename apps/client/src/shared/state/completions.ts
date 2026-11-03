import type { CompletedQuest, Quest, QuestEvent } from '@saigon/shared'
import type { GameState } from './game'

export function queuedDetails(state: GameState, events: QuestEvent[]) {
  return events
    .filter(
      (event) =>
        event.type === 'completed' &&
        state.rewardQueue.some((quest) => quest.id === event.quest.id)
    )
    .map((event) => event.quest)
}

/** A realtime batch may include summaries before individual full quest pushes. */
export function completionQuest(summary: CompletedQuest): Quest {
  return {
    ...summary,
    description: '',
    scope: 'solo',
    steps: [{ type: 'TALK_TO', npcId: summary.giverNpcId }],
    progress: [true],
    status: 'completed',
    createdAt: summary.completedAt,
  }
}

export function queueCompletions(
  state: GameState,
  incoming: Quest[]
): Partial<GameState> {
  if (!incoming.length) return {}
  const queue = [...state.rewardQueue]
  if (!queue.length && state.panel === 'reward' && state.rewardQuest)
    queue.push(state.rewardQuest)
  let added = false
  for (const quest of incoming) {
    const index = queue.findIndex((entry) => entry.id === quest.id)
    if (index === -1) {
      queue.push(quest)
      added = true
    } else
      queue[index] = { ...quest, payoff: quest.payoff ?? queue[index].payoff }
  }
  const current = queue[0]
  return current
    ? {
        rewardQueue: queue,
        rewardQuest: current,
        reward: current.reward.currency,
        ...(added
          ? {
              panel: 'reward' as const,
              dialogue: null,
              screen: 'playing' as const,
            }
          : {}),
      }
    : {}
}

export function nextCompletion(state: GameState): Partial<GameState> {
  const queue = state.rewardQueue.slice(1)
  const current = queue[0]
  return {
    rewardQueue: queue,
    rewardQuest: current ?? null,
    reward: current?.reward.currency ?? 0,
    ...(current ? { panel: 'reward' as const } : {}),
  }
}

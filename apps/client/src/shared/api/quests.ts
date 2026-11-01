import {
  applyQuestEvents,
  type GuestPlayer,
  GuestPlayerSchema,
  type Quest,
} from '@saigon/shared'
import { game, notify } from '@/shared/state/game'
import { rpc } from './client'
import { beginHttpTurn, endHttpTurn } from './events'
import { guestState } from './session'

export function removeQuestLocally(quest: Quest) {
  game.setState((state) => {
    if (!state.quests.some((entry) => entry.id === quest.id)) return state
    const quests = state.quests.filter((entry) => entry.id !== quest.id)
    const inventory = { ...state.world.inventory }
    for (const [index, step] of quest.steps.entries())
      if (step.type === 'DELIVER' && !quest.progress[index])
        inventory[step.itemId] = Math.max(0, (inventory[step.itemId] ?? 0) - 1)
    return {
      ...state,
      quests,
      trackedQuestId:
        state.trackedQuestId === quest.id
          ? (quests[0]?.id ?? null)
          : state.trackedQuestId,
      world: { ...state.world, inventory },
    }
  })
}
export function applyQuestSave(player: GuestPlayer) {
  game.setState((state) =>
    player.revision < state.serverRevision
      ? state
      : {
          ...state,
          ...guestState(player),
          ...applyQuestEvents(player.world, player.quests, state.pending),
          trackedQuestId: player.quests.some(
            (quest) => quest.id === state.trackedQuestId
          )
            ? state.trackedQuestId
            : (player.quests[0]?.id ?? null),
        }
  )
}
export async function abandonQuest(questId: string) {
  const quest = game.state.quests.find((entry) => entry.id === questId)
  if (!quest) return
  const sessionId = game.state.sessionId
  if (!(await beginHttpTurn())) {
    notify('Finish the current conversation, then try again.')
    return
  }
  try {
    if (game.state.sessionId !== sessionId) return
    if (game.state.guestStatus !== 'online') {
      if (quest.scope === 'party') {
        notify('Reconnect to abandon a shared errand.')
        return
      }
      removeQuestLocally(quest)
    } else {
      const response = await rpc.me.quests[':questId'].abandon.$post(
        { param: { questId } },
        { init: { signal: AbortSignal.timeout(5000) } }
      )
      if (!response.ok) throw new Error('abandon_failed')
      const player = GuestPlayerSchema.parse((await response.json()).player)
      if (game.state.sessionId !== sessionId) return
      applyQuestSave(player)
    }
    notify('The errand was removed from your journal.')
  } catch {
    notify('The errand could not be abandoned. Try again when connected.')
  } finally {
    endHttpTurn()
  }
}

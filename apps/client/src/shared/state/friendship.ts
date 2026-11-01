import {
  type FriendshipEvent,
  type FriendshipMap,
  friendlinessOf,
  NPCS,
  type NpcId,
  type Quest,
} from '@saigon/shared'
import { Store } from '@tanstack/store'
import { m, npcLabel } from '@/shared/i18n'
import { game, notify } from './game'
export const pulses = new Store<
  Partial<Record<NpcId, { delta: number; at: number }>>
>({})
export const levelOf = (npcId: NpcId) =>
  friendlinessOf(game.state.friendship, npcId)
export function noteFriendship(
  prev: FriendshipMap,
  next: FriendshipMap,
  _events?: FriendshipEvent[]
) {
  for (const npcId of Object.keys(NPCS) as NpcId[]) {
    const delta = friendlinessOf(next, npcId) - friendlinessOf(prev, npcId)
    if (!delta) continue
    pulses.setState((old) => ({ ...old, [npcId]: { delta, at: Date.now() } }))
    notify(
      m.friendship_changed({
        name: npcLabel(npcId),
        delta: `${delta > 0 ? '+' : ''}${delta}`,
      })
    )
  }
}

export function noteFailedQuests(
  before: Quest[],
  next: Quest[],
  completedIds: string[]
) {
  for (const quest of before) {
    if (
      !next.some((entry) => entry.id === quest.id) &&
      !completedIds.includes(quest.id)
    )
      notify(m.quest_failed({ title: quest.title }))
  }
}

import {
  type FriendshipEvent,
  friendlinessOf,
  isExpired,
  type NpcId,
  type Quest,
  type QuestEvent,
  shiftFriendship,
  ZERO_REWARD,
} from '@saigon/shared'
import type { PlayerSave } from '@/shared/db'
import { reclaimDeliveries } from './rewards'

export function shift(
  save: PlayerSave,
  npcId: NpcId,
  delta: number,
  reason: FriendshipEvent['reason']
): FriendshipEvent {
  const before = friendlinessOf(save.friendship, npcId)
  save.friendship = shiftFriendship(save.friendship, npcId, delta)
  const level = friendlinessOf(save.friendship, npcId)
  return { npcId, delta: level - before, level, reason }
}
export function failQuest(
  save: PlayerSave,
  quest: Quest,
  reason: 'abandoned' | 'expired' | 'declined'
): QuestEvent {
  reclaimDeliveries(save, quest)
  save.quests = save.quests.filter((entry) => entry.id !== quest.id)
  shift(save, quest.giverNpcId, -1, reason)
  return {
    type: 'failed',
    reason,
    quest: structuredClone(quest),
    reward: ZERO_REWARD,
  }
}
export function expireQuests(save: PlayerSave, now = Date.now()) {
  return save.quests
    .filter((quest) => isExpired(quest, now))
    .map((quest) => failQuest(save, quest, 'expired'))
}

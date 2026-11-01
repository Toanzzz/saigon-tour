import {
  bonusCurrency,
  completionBonus,
  type Quest,
  type QuestEvent,
} from '@saigon/shared'
import type { PlayerSave, SqlClient } from '@/shared/db'

/** The completion ledger and reward update share the same transaction. */
export async function grantQuest(
  playerId: string,
  record: PlayerSave,
  quest: Quest,
  client: SqlClient
): Promise<QuestEvent | null> {
  const inserted = await client.query(
    'INSERT INTO quest_completions(player_id,quest_id) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING quest_id',
    [playerId, quest.id]
  )
  quest.status = 'completed'
  if (!inserted.rows.length) return null
  const bonus = completionBonus(quest)
  const extra = bonusCurrency(bonus)
  const reward = {
    ...quest.reward,
    currency: Math.min(100, quest.reward.currency + extra),
    ...(extra ? { bonus } : {}),
  }
  // The reward card reads event.quest.reward via rewardQuest; keep them aligned.
  quest.reward = reward
  record.world.currency = Math.min(
    100000,
    record.world.currency + reward.currency
  )
  if (reward.itemId)
    record.world.inventory[reward.itemId] = Math.min(
      100,
      (record.world.inventory[reward.itemId] ?? 0) + 1
    )
  record.reputation += reward.reputation
  if (reward.unlockId && !record.unlocks.owned.includes(reward.unlockId))
    record.unlocks.owned = [...record.unlocks.owned, reward.unlockId]
  record.world.completedQuestIds = [
    ...record.world.completedQuestIds,
    quest.id,
  ].slice(-32)
  record.completed = [
    ...record.completed,
    {
      id: quest.id,
      title: quest.title,
      giverNpcId: quest.giverNpcId,
      reward,
      completedAt: Date.now(),
    },
  ].slice(-32)
  return { type: 'completed', quest: structuredClone(quest), reward }
}

export function allocateDeliveries(record: PlayerSave, quest: Quest) {
  for (const step of quest.steps)
    if (step.type === 'DELIVER')
      record.world.inventory[step.itemId] = Math.min(
        100,
        (record.world.inventory[step.itemId] ?? 0) + 1
      )
}

export function reclaimDeliveries(record: PlayerSave, quest: Quest) {
  for (const [index, step] of quest.steps.entries())
    if (step.type === 'DELIVER' && !quest.progress[index])
      record.world.inventory[step.itemId] = Math.max(
        0,
        (record.world.inventory[step.itemId] ?? 0) - 1
      )
}

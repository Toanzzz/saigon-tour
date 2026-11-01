import {
  applyQuestEvents,
  createQuest,
  isReady,
  type NpcId,
  type PartySnapshot,
  type PlayerEvent,
  type Quest,
  type QuestEvent,
  type QuestSpec,
  validateSpec,
  ZERO_REWARD,
} from '@saigon/shared'
import type { GameDb } from '@/shared/db'

export type OfferResult =
  | { accepted: true; quest: Quest }
  | { accepted: false; reason: string }

/** Agent proposals become authoritative state only inside a player transaction. */
export class QuestService {
  party?: { snapshot(playerId: string): PartySnapshot | null }
  constructor(private readonly db: GameDb) {}

  get(playerId: string) {
    return this.db.readPlayer(playerId)
  }

  applyEvents(playerId: string, events: PlayerEvent[], _npcId?: NpcId) {
    return this.db.mutatePlayer(playerId, (record) => {
      const advanced = applyQuestEvents(record.world, record.quests, events)
      record.world = advanced.world
      record.quests = advanced.quests
      return structuredClone(record)
    })
  }

  proposeQuest(
    playerId: string,
    giver: NpcId,
    input: QuestSpec
  ): Promise<OfferResult> {
    return this.db.mutatePlayer<OfferResult>(playerId, (record) => {
      if (input.giverNpcId !== giver)
        return { accepted: false, reason: 'not_your_quest' }
      const result = validateSpec(input, {
        quests: record.quests,
        inParty: Boolean(this.party?.snapshot(playerId)),
      })
      if (!result.ok) return { accepted: false, reason: result.reason }
      // Party assignment and shared rewards are a separate vertical slice.
      if (result.spec.scope === 'party')
        return { accepted: false, reason: 'party_quests_not_available' }
      const quest = createQuest(result.spec)
      record.quests.push(quest)
      for (const step of quest.steps)
        if (step.type === 'DELIVER')
          record.world.inventory[step.itemId] = Math.min(
            100,
            (record.world.inventory[step.itemId] ?? 0) + 1
          )
      return { accepted: true, quest: structuredClone(quest) }
    })
  }

  checkQuests(playerId: string, giver: NpcId): Promise<QuestEvent[]> {
    return this.db.mutatePlayer(playerId, async (record, client) => {
      const events: QuestEvent[] = []
      for (const quest of record.quests) {
        if (quest.giverNpcId !== giver) continue
        if (!isReady(quest)) {
          events.push({
            type: 'incomplete',
            quest: structuredClone(quest),
            reward: ZERO_REWARD,
          })
          continue
        }
        const inserted = await client.query(
          'INSERT INTO quest_completions(player_id,quest_id) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING quest_id',
          [playerId, quest.id]
        )
        quest.status = 'completed'
        if (!inserted.rows.length) continue
        const reward = quest.reward
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
        record.world.completedQuestIds = [
          ...record.world.completedQuestIds,
          quest.id,
        ].slice(-32)
        record.completed.push({
          id: quest.id,
          title: quest.title,
          giverNpcId: quest.giverNpcId,
          reward,
          completedAt: Date.now(),
        })
        record.completed = record.completed.slice(-32)
        events.push({
          type: 'completed',
          quest: structuredClone(quest),
          reward,
        })
      }
      record.quests = record.quests.filter(
        (quest) => quest.status !== 'completed'
      )
      return events
    })
  }
}

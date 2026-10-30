import {
  applyPlayerEvents,
  type NpcId,
  objectiveSatisfied,
  type PlayerEvent,
  type Quest,
  type Reward,
  ZERO_REWARD,
} from '@saigon/shared'
import type { GameDb, PlayerSave } from '../db'
import { questTemplate } from './quests'

export type PlayerRecord = PlayerSave
export type OfferResult =
  | { accepted: true; quest: Quest }
  | { accepted: false; reason: string }
export type CheckResult = {
  status: 'active' | 'completed' | 'not_found'
  rewardGranted: boolean
  reward: Reward
  message: string
}

/** Authoritative mutations are serialized and persisted by the database. */
export class GameService {
  constructor(private readonly db: GameDb) {}

  async get(playerId: string): Promise<PlayerRecord> {
    return this.db.readPlayer(playerId)
  }

  /** Apply client-observed world events. Only physically plausible ones count. */
  async applyEvents(
    playerId: string,
    events: PlayerEvent[]
  ): Promise<PlayerRecord> {
    return this.db.mutatePlayer(playerId, (record) => {
      record.world = applyPlayerEvents(record.world, events)
      return structuredClone(record)
    })
  }

  async offerQuest(
    playerId: string,
    giver: NpcId,
    templateId: string
  ): Promise<OfferResult> {
    return this.db.mutatePlayer<OfferResult>(playerId, (record) => {
      const template = questTemplate(templateId)
      if (!template) return { accepted: false, reason: 'unknown_template' }
      if (template.giverNpcId !== giver)
        return { accepted: false, reason: 'not_your_quest' }
      if (record.world.completedQuestIds.includes(template.id))
        return { accepted: false, reason: 'already_completed' }
      if (record.quest)
        return record.quest.id === template.id
          ? { accepted: true, quest: record.quest }
          : { accepted: false, reason: 'quest_in_progress' }
      const quest = structuredClone(template)
      record.quest = quest
      if (quest.objective.type === 'DELIVER') {
        const item = quest.objective.itemId
        record.world.inventory = {
          ...record.world.inventory,
          [item]: (record.world.inventory[item] ?? 0) + 1,
        }
      }
      return { accepted: true, quest }
    })
  }

  async checkQuest(
    playerId: string,
    giver: NpcId,
    questId: string
  ): Promise<CheckResult> {
    return this.db.mutatePlayer<CheckResult>(playerId, (record) => {
      if (record.world.completedQuestIds.includes(questId))
        return {
          status: 'completed',
          rewardGranted: false,
          reward: ZERO_REWARD,
          message: 'Reward was already given for this errand.',
        }
      const quest = record.quest
      if (!quest || quest.id !== questId || quest.giverNpcId !== giver)
        return {
          status: 'not_found',
          rewardGranted: false,
          reward: ZERO_REWARD,
          message: 'No such active errand from you.',
        }
      if (!objectiveSatisfied(quest, record.world))
        return {
          status: 'active',
          rewardGranted: false,
          reward: ZERO_REWARD,
          message: describeRemaining(quest),
        }
      const reward = quest.reward
      const world = record.world
      world.currency += reward.currency
      world.completedQuestIds = [...world.completedQuestIds, quest.id]
      if (reward.itemId)
        world.inventory = {
          ...world.inventory,
          [reward.itemId]: (world.inventory[reward.itemId] ?? 0) + 1,
        }
      record.reputation += reward.reputation
      record.completed = [...record.completed, quest]
      record.quest = null
      return {
        status: 'completed',
        rewardGranted: true,
        reward,
        message: 'Objective verified. Reward granted.',
      }
    })
  }
}

function describeRemaining(quest: Quest): string {
  const objective = quest.objective
  if (objective.type === 'DELIVER')
    return `The ${objective.itemId} have not reached ${objective.npcId} yet.`
  return 'The objective is not done yet.'
}

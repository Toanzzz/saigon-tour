import {
  type NpcId,
  objectiveSatisfied,
  type PlayerEvent,
  type Quest,
  type Reward,
  STARTING_CURRENCY,
  type WorldState,
  ZERO_REWARD,
} from '@saigon/shared'
import { questTemplate } from './quests'

export interface PlayerRecord {
  world: WorldState
  quest: Quest | null
  completed: Quest[]
  reputation: number
  expiresAt: number
}
export type OfferResult =
  | { accepted: true; quest: Quest }
  | { accepted: false; reason: string }
export type CheckResult = {
  status: 'active' | 'completed' | 'not_found'
  rewardGranted: boolean
  reward: Reward
  message: string
}

const TTL = 60 * 60 * 1000
const fresh = (): PlayerRecord => ({
  world: {
    locationId: 'market',
    inventory: {},
    visitedLocations: ['market'],
    talkedTo: [],
    deliveredItems: [],
    completedQuestIds: [],
    currency: STARTING_CURRENCY,
  },
  quest: null,
  completed: [],
  reputation: 0,
  expiresAt: Date.now() + TTL,
})

/**
 * Authoritative per-player game state. Models only reach it through tools;
 * every mutation is validated here.
 */
export class GameService {
  private players = new Map<string, PlayerRecord>()

  constructor(private readonly capacity = 2000) {}

  get(playerId: string, now = Date.now()): PlayerRecord {
    for (const [id, record] of this.players)
      if (record.expiresAt <= now) this.players.delete(id)
    let record = this.players.get(playerId)
    if (!record) {
      if (this.players.size >= this.capacity) {
        const oldest = this.players.keys().next().value
        if (oldest !== undefined) this.players.delete(oldest)
      }
      record = fresh()
      this.players.set(playerId, record)
    }
    record.expiresAt = now + TTL
    return record
  }

  /** Apply client-observed world events. Only physically plausible ones count. */
  applyEvents(playerId: string, events: PlayerEvent[]): PlayerRecord {
    const record = this.get(playerId)
    const world = record.world
    for (const event of events) {
      if (event.type === 'visit') {
        world.locationId = event.locationId
        world.visitedLocations = [
          ...new Set([...world.visitedLocations, event.locationId]),
        ]
      }
      if (event.type === 'talk')
        world.talkedTo = [...new Set([...world.talkedTo, event.npcId])]
      if (event.type === 'spend')
        world.currency = Math.max(0, world.currency - event.amount)
      if (event.type === 'deliver') {
        const held = world.inventory[event.itemId] ?? 0
        const key = `${event.itemId}:${event.npcId}`
        if (held > 0 && !world.deliveredItems.includes(key)) {
          world.inventory = { ...world.inventory, [event.itemId]: held - 1 }
          world.deliveredItems = [...world.deliveredItems, key]
        }
      }
    }
    return record
  }

  offerQuest(playerId: string, giver: NpcId, templateId: string): OfferResult {
    const record = this.get(playerId)
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
  }

  checkQuest(playerId: string, giver: NpcId, questId: string): CheckResult {
    const record = this.get(playerId)
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
  }
}

function describeRemaining(quest: Quest): string {
  const objective = quest.objective
  if (objective.type === 'DELIVER')
    return `The ${objective.itemId} have not reached ${objective.npcId} yet.`
  return 'The objective is not done yet.'
}

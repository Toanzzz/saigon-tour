import {
  type Dish,
  DishSchema,
  type NpcId,
  type PlayerEvent,
  TEAM_QUEST,
  ZERO_REWARD,
} from '@saigon/shared'
import type { GameDb } from '../db'
import type { CheckResult, OfferResult } from '../game/state'
import type { PartyService } from './index'

export class TeamErrand {
  constructor(
    private readonly parties: PartyService,
    private readonly db: GameDb
  ) {}

  async offerQuest(
    playerId: string,
    giver: NpcId,
    templateId: string
  ): Promise<OfferResult> {
    if (templateId !== TEAM_QUEST.id)
      return { accepted: false, reason: 'unknown_template' }
    if (giver !== TEAM_QUEST.giverNpcId)
      return { accepted: false, reason: 'not_your_quest' }
    const party = this.parties.current(playerId)
    if (!party || party.members.length < 2)
      return { accepted: false, reason: 'party_required' }
    for (const member of party.members) {
      const save = await this.db.readPlayer(member.id)
      if (save.world.completedQuestIds.includes(TEAM_QUEST.id))
        return { accepted: false, reason: 'already_completed' }
    }
    if (party.quest)
      return party.quest.completed
        ? { accepted: false, reason: 'already_completed' }
        : { accepted: true, quest: structuredClone(TEAM_QUEST) }
    const dishes: Dish[] = ['noodles', 'broth', 'baguette', 'coffee']
    party.quest = {
      id: 'hoa-team-lunch',
      completed: false,
      assignments: party.members.map((member, index) => ({
        playerId: member.id,
        name: member.name,
        dish: dishes[index],
        delivered: false,
      })),
    }
    this.parties.push(party)
    return { accepted: true, quest: structuredClone(TEAM_QUEST) }
  }

  deliver(playerId: string, event: PlayerEvent, npcId?: NpcId) {
    if (
      event.type !== 'deliver' ||
      !DishSchema.safeParse(event.itemId).success ||
      event.npcId !== 'linh' ||
      npcId !== 'linh'
    )
      return false
    const party = this.parties.current(playerId)
    if (!party?.quest || party.quest.completed) return false
    const assignment = party.quest.assignments.find(
      (entry) => entry.playerId === playerId
    )
    if (!assignment || assignment.dish !== event.itemId) return false
    if (!assignment.delivered) {
      assignment.delivered = true
      this.parties.push(party)
    }
    return true
  }

  async checkQuest(
    playerId: string,
    giver: NpcId,
    questId: string
  ): Promise<CheckResult> {
    const quest = structuredClone(TEAM_QUEST)
    const base = { quest, rewardGranted: false, reward: ZERO_REWARD }
    const party = this.parties.current(playerId)
    if (giver !== quest.giverNpcId || questId !== quest.id || !party?.quest)
      return {
        ...base,
        status: 'not_found',
        message: 'No active team lunch errand from you.',
      }
    const errand = party.quest
    if (errand.completed)
      return {
        ...base,
        status: 'completed',
        message: 'The team lunch reward was already given.',
      }
    if (
      errand.assignments.length < 2 ||
      errand.assignments.some((assignment) => !assignment.delivered)
    )
      return {
        ...base,
        status: 'active',
        message: 'Every assigned teammate must deliver their dish to Chị Linh.',
      }
    let rewardGranted = false
    for (const assignment of errand.assignments) {
      const result = await this.db.mutatePlayer(
        assignment.playerId,
        async (save, client) => {
          const inserted = await client.query(
            'INSERT INTO quest_completions(player_id,quest_id) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING quest_id',
            [assignment.playerId, quest.id]
          )
          if (!inserted.rows.length)
            return { granted: false, save: structuredClone(save) }
          save.world.currency += quest.reward.currency
          save.world.completedQuestIds = [
            ...new Set([...save.world.completedQuestIds, quest.id]),
          ]
          const item = quest.reward.itemId
          if (item)
            save.world.inventory[item] = (save.world.inventory[item] ?? 0) + 1
          save.reputation += quest.reward.reputation
          save.completed.push(quest)
          return { granted: true, save: structuredClone(save) }
        }
      )
      if (result.granted) {
        if (assignment.playerId === playerId) rewardGranted = true
        this.parties.rooms.send(assignment.playerId, {
          type: 'quest-completed',
          revision: result.save.revision,
          world: result.save.world,
          completed: result.save.completed,
          reputation: result.save.reputation,
          quest,
        })
      }
      this.parties.rooms.send(assignment.playerId, {
        type: 'world',
        ...result.save,
        sequence:
          this.parties.rooms
            .room(assignment.playerId)
            ?.members.get(assignment.playerId)?.acknowledgedSequence ?? 0,
      })
    }
    errand.completed = true
    this.parties.push(party)
    return {
      quest,
      status: 'completed',
      rewardGranted,
      reward: rewardGranted ? quest.reward : ZERO_REWARD,
      message:
        'The community lunch arrived. Every assigned teammate is rewarded.',
    }
  }
}

import {
  applyQuestEvents,
  type CitySnapshot,
  createQuest,
  type ItemId,
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
import type { GameDb, PlayerSave } from '@/shared/db'
import { allocateDeliveries, grantQuest, reclaimDeliveries } from './rewards'

export type OfferResult =
  | { accepted: true; quest: Quest }
  | { accepted: false; reason: string }

/** Agent proposals become authoritative state only inside player transactions. */
export class QuestService {
  city?: (playerId: string) => CitySnapshot | null
  party?: { snapshot(playerId: string): PartySnapshot | null }
  push?: (playerId: string, save: PlayerSave, completed?: Quest) => void
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

  async proposeQuest(
    playerId: string,
    giver: NpcId,
    input: QuestSpec
  ): Promise<OfferResult> {
    if (input.giverNpcId !== giver)
      return { accepted: false, reason: 'not_your_quest' }
    const party =
      input.scope === 'party' ? this.party?.snapshot(playerId) : null
    if (input.scope === 'party' && (!party || party.members.length < 2))
      return { accepted: false, reason: 'party_required' }
    const ids = party ? party.members.map((member) => member.id) : [playerId]
    const updates = new Map<string, PlayerSave>()
    const result = await this.db.mutatePlayers<OfferResult>(ids, (saves) => {
      if (party) {
        const current = this.party?.snapshot(playerId)
        if (
          current?.id !== party.id ||
          current.members
            .map((member) => member.id)
            .sort()
            .join(',') !== [...ids].sort().join(',')
        )
          return { accepted: false, reason: 'party_changed' }
      }
      for (const id of ids) {
        const record = saves.get(id)
        if (!record) return { accepted: false, reason: 'member_not_found' }
        const checked = validateSpec(input, {
          quests: record.quests,
          inParty: Boolean(party),
        })
        if (!checked.ok) return { accepted: false, reason: checked.reason }
        const counts = new Map<ItemId, number>()
        for (const step of checked.spec.steps)
          if (step.type === 'DELIVER')
            counts.set(step.itemId, (counts.get(step.itemId) ?? 0) + 1)
        for (const [item, count] of counts)
          if ((record.world.inventory[item] ?? 0) + count > 100)
            return { accepted: false, reason: `inventory_full:${item}` }
      }
      const quest = createQuest(input)
      if (party) quest.party = { id: party.id, memberIds: ids }
      for (const id of ids) {
        const record = saves.get(id)
        if (!record) throw new Error('player_not_found')
        record.quests.push(structuredClone(quest))
        allocateDeliveries(record, quest)
        updates.set(id, structuredClone(record))
      }
      return { accepted: true, quest }
    })
    if (party && result.accepted)
      for (const [id, save] of updates) this.push?.(id, save)
    return result
  }

  async checkQuests(playerId: string, giver: NpcId): Promise<QuestEvent[]> {
    const before = await this.get(playerId)
    const ids = [
      playerId,
      ...before.quests
        .filter((quest) => quest.giverNpcId === giver)
        .flatMap((quest) => quest.party?.memberIds ?? []),
    ]
    const capturedQuestIds = new Set(before.quests.map((quest) => quest.id))
    const notifications: { id: string; quest: Quest; save: PlayerSave }[] = []
    const events = await this.db.mutatePlayers(ids, async (saves, client) => {
      const record = saves.get(playerId)
      if (!record) throw new Error('player_not_found')
      const output: QuestEvent[] = []
      const granted: { id: string; quest: Quest }[] = []
      for (const quest of record.quests) {
        if (quest.giverNpcId !== giver || !capturedQuestIds.has(quest.id))
          continue
        const participants = quest.party
          ? quest.party.memberIds.flatMap((id) => {
              const save = saves.get(id)
              const ownQuest = save?.quests.find(
                (entry) => entry.id === quest.id
              )
              return save && ownQuest ? [{ id, save, quest: ownQuest }] : []
            })
          : [{ id: playerId, save: record, quest }]
        if (
          !participants.length ||
          participants.some((entry) => !isReady(entry.quest))
        ) {
          output.push({
            type: 'incomplete',
            quest: structuredClone(quest),
            reward: ZERO_REWARD,
          })
          continue
        }
        for (const participant of participants) {
          const event = await grantQuest(
            participant.id,
            participant.save,
            participant.quest,
            client
          )
          if (event) {
            if (participant.id === playerId) output.push(event)
            if (quest.party)
              granted.push({ id: participant.id, quest: event.quest })
          }
        }
      }
      for (const save of saves.values())
        save.quests = save.quests.filter(
          (quest) => quest.status !== 'completed'
        )
      for (const item of granted) {
        const save = saves.get(item.id)
        if (save) notifications.push({ ...item, save: structuredClone(save) })
      }
      return output
    })
    for (const update of notifications)
      this.push?.(update.id, update.save, update.quest)
    return events
  }

  async abandon(playerId: string, questId: string) {
    await this.db.mutatePlayer(playerId, (record) => {
      const quest = record.quests.find((entry) => entry.id === questId)
      if (quest) reclaimDeliveries(record, quest)
      record.quests = record.quests.filter((entry) => entry.id !== questId)
    })
    const player = await this.db.player(playerId)
    this.push?.(playerId, player)
    return player
  }
}

import {
  applyQuestEvents,
  CHAT_COOLDOWN_MS,
  CHAT_FRIENDSHIP_MAX,
  type CitySnapshot,
  canOfferQuests,
  createQuest,
  friendlinessOf,
  type ItemId,
  isReady,
  type Look,
  type NpcId,
  type PartySnapshot,
  type PlayerEvent,
  type Quest,
  type QuestEvent,
  type QuestSpec,
  slotOf,
  type UnlockId,
  type UnlockSlot,
  validateSpec,
  ZERO_REWARD,
} from '@saigon/shared'
import type { GameDb, PlayerSave } from '@/shared/db'
import { expireQuests, failQuest, shift } from './friendship'
import { allocateDeliveries, grantQuest } from './rewards'

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

  async applyEvents(
    playerId: string,
    events: PlayerEvent[],
    _npcId?: NpcId,
    now = Date.now()
  ) {
    const before = await this.get(playerId)
    const ids = [
      playerId,
      ...before.quests.flatMap((quest) => quest.party?.memberIds ?? []),
    ]
    const updates = new Map<string, PlayerSave>()
    const result = await this.db.mutatePlayers(ids, (saves) => {
      const record = saves.get(playerId)
      if (!record) throw new Error('player_not_found')
      const advanced = applyQuestEvents(record.world, record.quests, events)
      record.world = advanced.world
      record.quests = advanced.quests
      const questEvents = expireQuests(record, now)
      for (const [id, save] of saves) {
        if (id === playerId) continue
        const failed = expireQuests(save, now)
        if (failed.length) updates.set(id, structuredClone(save))
      }
      return { ...structuredClone(record), questEvents }
    })
    for (const [id, save] of updates) this.push?.(id, save)
    return result
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
        if (!canOfferQuests(record.friendship, giver))
          return { accepted: false, reason: 'friendliness_too_low' }
        const checked = validateSpec(input, {
          quests: record.quests,
          inParty: Boolean(party),
          inventory: record.world.inventory,
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
      const proposer = saves.get(playerId)
      const promised = proposer
        ? proposer.quests
            .filter((entry) => entry.status !== 'completed')
            .map((entry) => entry.reward.unlockId)
            .filter((id): id is NonNullable<typeof id> => Boolean(id))
        : []
      const quest = createQuest(input, undefined, undefined, {
        owned: proposer?.unlocks.owned ?? [],
        promised,
        friendship: friendlinessOf(proposer?.friendship ?? {}, giver),
      })
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
            shift(participant.save, giver, 1, 'completed')
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

  /**
   * Equip or clear a cosmetic/vehicle/pet slot. The player must already own the
   * item, and the slot must match the item's slot. Returns the new look or null
   * when the request is rejected.
   */
  async equip(
    playerId: string,
    slot: UnlockSlot,
    id: UnlockId | null
  ): Promise<Look | null | 'rejected'> {
    const result = await this.db.mutatePlayer(playerId, (save) => {
      if (id !== null) {
        if (!save.unlocks.owned.includes(id)) return 'rejected' as const
        if (slotOf(id) !== slot) return 'rejected' as const
        save.unlocks.equipped = { ...save.unlocks.equipped, [slot]: id }
      } else {
        const next = { ...save.unlocks.equipped }
        delete next[slot]
        save.unlocks.equipped = next
      }
      const equipped = save.unlocks.equipped
      return Object.keys(equipped).length ? { ...equipped } : null
    })
    return result
  }

  async adjustFriendship(
    playerId: string,
    npcId: NpcId,
    dir: 'warmer' | 'cooler',
    now = Date.now()
  ) {
    return this.db.mutatePlayer(playerId, (save) => {
      const last = save.friendship[npcId]?.chatAt
      if (last !== undefined && now - last < CHAT_COOLDOWN_MS) return null
      if (
        dir === 'warmer' &&
        friendlinessOf(save.friendship, npcId) >= CHAT_FRIENDSHIP_MAX
      )
        return null
      const event = shift(save, npcId, dir === 'warmer' ? 1 : -1, 'chat')
      save.friendship[npcId] = { level: event.level, chatAt: now }
      return event
    })
  }

  async expire(playerId: string, now = Date.now()) {
    await this.applyEvents(playerId, [], undefined, now)
    return this.db.player(playerId)
  }

  abandon(playerId: string, questId: string) {
    return this.fail(playerId, questId, 'abandoned')
  }

  async fail(
    playerId: string,
    questId: string,
    reason: 'abandoned' | 'declined',
    giver?: NpcId
  ) {
    await this.db.mutatePlayer(playerId, (record) => {
      const quest = record.quests.find((entry) => entry.id === questId)
      if (!quest) return
      if (
        reason === 'declined' &&
        (quest.giverNpcId !== giver ||
          quest.status !== 'active' ||
          quest.progress.some(Boolean))
      )
        return
      failQuest(record, quest, reason)
    })
    const player = await this.db.player(playerId)
    this.push?.(playerId, player)
    return player
  }
}

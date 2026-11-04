import {
  applyQuestEvents,
  consumeGood,
  creditEligible,
  MARKET_ITEMS,
  type MarketItemId,
  type NeighborId,
  NPC_SHOPS,
  NPCS,
  type NpcId,
  type PlayerEvent,
  RARE_WEARABLES,
  RESIDENT_ANCHORS,
} from '@saigon/shared'
import type { RoomManager } from '@/features/realtime'
import type { GameDb, PlayerSave } from '@/shared/db'

export class ShopError extends Error {}
export interface ItemAction {
  requestId: string
  events: PlayerEvent[]
}
export interface BuyAction extends ItemAction {
  npcId: NpcId
  itemId?: MarketItemId
  offerId?: string
}
export interface UseAction extends ItemAction {
  itemId: MarketItemId
}
export interface ItemReceipt {
  requestId: string
  restore: number
}

/** Inventory, wallet, quest progress and receipt commit together under the player lock. */
export class ShopService {
  constructor(
    private readonly db: GameDb,
    private readonly rooms: RoomManager,
    private readonly now = Date.now
  ) {}

  private near(playerId: string, npcId: NpcId) {
    const room = this.rooms.room(playerId)
    const member = room?.members.get(playerId)
    if (!room || !member?.socket || member.player.ride)
      throw new ShopError('shop_unavailable')
    const at =
      NPCS[npcId].kind === 'neighbor'
        ? room.city.position(npcId as NeighborId)
        : [
            RESIDENT_ANCHORS[npcId as keyof typeof RESIDENT_ANCHORS].at[0],
            0,
            RESIDENT_ANCHORS[npcId as keyof typeof RESIDENT_ANCHORS].at[1],
          ]
    const position = member.player.position
    if (Math.hypot(at[0] - position[0], at[2] - position[2]) > 5)
      throw new ShopError('too_far_from_shop')
    return room
  }

  private async action(
    playerId: string,
    input: ItemAction,
    kind: 'buy' | 'use',
    apply: (save: PlayerSave) => number
  ) {
    if (input.events.some((event) => event.type === 'purchase'))
      throw new ShopError('purchase_event_forbidden')
    const fingerprint = JSON.stringify({ kind, ...input })
    const receipt = await this.db.mutatePlayer(playerId, async (save, sql) => {
      const previous = await sql.query(
        'SELECT fingerprint,receipt FROM item_actions WHERE player_id=$1 AND request_id=$2',
        [playerId, input.requestId]
      )
      if (previous.rows[0]) {
        if (previous.rows[0].fingerprint !== fingerprint)
          throw new ShopError('request_id_reused')
        return previous.rows[0].receipt as unknown as ItemReceipt
      }
      const advanced = applyQuestEvents(save.world, save.quests, input.events)
      save.world = advanced.world
      save.quests = advanced.quests
      const restore = apply(save)
      const result = { requestId: input.requestId, restore }
      await sql.query(
        'INSERT INTO item_actions(player_id,request_id,fingerprint,receipt) VALUES($1,$2,$3,$4)',
        [playerId, input.requestId, fingerprint, JSON.stringify(result)]
      )
      return result
    })
    const player = await this.db.player(playerId)
    this.rooms.send(playerId, {
      type: 'world',
      ...player,
      sequence:
        this.rooms.room(playerId)?.members.get(playerId)
          ?.acknowledgedSequence ?? 0,
    })
    return { player, receipt }
  }

  buy(playerId: string, input: BuyAction) {
    return this.action(playerId, input, 'buy', (save) => {
      const room = this.near(playerId, input.npcId)
      const now = this.now()
      if (input.itemId) {
        const itemId = input.itemId
        if (!NPC_SHOPS[input.npcId].includes(itemId))
          throw new ShopError('item_not_sold')
        if ((save.world.inventory[itemId] ?? 0) >= 100)
          throw new ShopError('inventory_full')
        const affordable = save.world.currency >= MARKET_ITEMS[itemId].price
        const credit = !affordable && creditEligible(save.quests, itemId)
        if (!affordable && !credit) throw new ShopError('insufficient_funds')
        const advanced = applyQuestEvents(save.world, save.quests, [
          { type: 'purchase', itemId, ...(credit ? { credit: true } : {}) },
        ])
        save.world = advanced.world
        save.quests = advanced.quests
      } else {
        room.city.expire(now)
        const offer = room.city.snapshot().rareOffer
        if (
          !offer ||
          offer.id !== input.offerId ||
          offer.npcId !== input.npcId ||
          now < offer.startedAt ||
          now >= offer.endsAt
        )
          throw new ShopError('offer_expired')
        const def = RARE_WEARABLES[offer.unlockId]
        if (save.unlocks.owned.includes(offer.unlockId))
          throw new ShopError('already_owned')
        if (save.world.currency < def.price)
          throw new ShopError('insufficient_funds')
        save.world = {
          ...save.world,
          currency: save.world.currency - def.price,
        }
        save.unlocks = {
          ...save.unlocks,
          owned: [...save.unlocks.owned, offer.unlockId],
        }
      }
      return 0
    })
  }

  use(playerId: string, input: UseAction) {
    return this.action(playerId, input, 'use', (save) => {
      const result = consumeGood(
        save.world,
        save.quests,
        input.itemId,
        this.now()
      )
      if ('error' in result) throw new ShopError(result.error)
      save.world = result.world
      return result.restore
    })
  }
}

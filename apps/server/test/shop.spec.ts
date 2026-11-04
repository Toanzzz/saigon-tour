import { randomUUID } from 'node:crypto'
import { createQuest, type GuestPlayer, NPC_POSITIONS } from '@saigon/shared'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { QuestService } from '@/domain/quests'
import { RoomManager } from '@/features/realtime'
import { ShopService } from '@/features/shop'
import { fixture } from './fixture'

describe('NPC shop transactions', () => {
  let fx: Awaited<ReturnType<typeof fixture>>
  let player: GuestPlayer
  let rooms: RoomManager
  let shop: ShopService
  let now = Date.parse('2098-03-01T08:00:00Z')
  beforeAll(async () => {
    fx = await fixture()
  })
  afterAll(async () => {
    await fx.close()
  })
  beforeEach(async () => {
    now = Date.parse('2098-03-01T08:00:00Z')
    player = (await fx.guest()).player
    rooms = new RoomManager({ bark: async () => ({ reply: '' }) }, () => now)
    rooms.connect(player, { send() {}, close() {} })
    const presence = rooms.getPlayer(player.id)
    if (!presence) throw new Error('missing_presence')
    presence.position = [...NPC_POSITIONS.mai]
    presence.ride = null
    shop = new ShopService(fx.db, rooms, () => now)
  })
  const buy = () => ({
    requestId: randomUUID(),
    npcId: 'mai' as const,
    itemId: 'coffee' as const,
    events: [],
  })

  it('charges the catalog price and handles replay without a second purchase', async () => {
    const input = buy()
    const first = await shop.buy(player.id, input)
    const replay = await shop.buy(player.id, input)
    expect(first.player.world).toMatchObject({
      currency: 27,
      inventory: { coffee: 1 },
    })
    expect(replay.player.world).toEqual(first.player.world)
    expect(replay.receipt).toEqual(first.receipt)
    await expect(
      shop.buy(player.id, { ...input, itemId: 'banana' })
    ).rejects.toThrow('request_id_reused')
  })

  it('rejects goods sold by another NPC and purchases from outside interaction range', async () => {
    await expect(
      shop.buy(player.id, { ...buy(), itemId: 'banana' })
    ).rejects.toThrow('item_not_sold')
    const presence = rooms.getPlayer(player.id)
    if (!presence) throw new Error('missing_presence')
    presence.position = [100, 0, 100]
    await expect(shop.buy(player.id, buy())).rejects.toThrow(
      'too_far_from_shop'
    )
    expect((await fx.db.player(player.id)).world.currency).toBe(30)
  })

  it('follows Director placement rather than the seller home', async () => {
    const room = rooms.room(player.id)
    if (!room) throw new Error('missing_room')
    room.city.apply({
      type: 'move-npc',
      npcId: 'mai',
      locationId: 'park',
      anchorId: 'gathering',
    })
    await expect(shop.buy(player.id, buy())).rejects.toThrow(
      'too_far_from_shop'
    )
    const presence = rooms.getPlayer(player.id)
    if (!presence) throw new Error('missing_presence')
    presence.position = [...room.city.position('mai')]
    expect(
      (await shop.buy(player.id, buy())).player.world.inventory.coffee
    ).toBe(1)
  })

  it('serializes concurrent spending and atomically applies pending spend events', async () => {
    await fx.db.mutatePlayer(player.id, (save) => {
      save.world.currency = 3
    })
    const result = await Promise.allSettled([
      shop.buy(player.id, buy()),
      shop.buy(player.id, buy()),
    ])
    expect(result.filter((entry) => entry.status === 'fulfilled')).toHaveLength(
      1
    )
    expect((await fx.db.player(player.id)).world).toMatchObject({
      currency: 0,
      inventory: { coffee: 1 },
    })
    await fx.db.mutatePlayer(player.id, (save) => {
      save.world.currency = 8
    })
    const next = await shop.buy(player.id, {
      ...buy(),
      events: [{ type: 'spend', amount: 5, mode: 'bus' }],
    })
    expect(next.player.world.currency).toBe(0)
    expect(next.player.world.inventory.coffee).toBe(2)
  })

  it('credits only an active required purchase and advances its BUY step', async () => {
    await fx.db.mutatePlayer(player.id, (save) => {
      save.world.currency = 0
      save.quests = [
        createQuest({
          giverNpcId: 'hoa',
          title: 'Coffee for a neighbor',
          description: 'Buy a coffee.',
          scope: 'solo',
          steps: [{ type: 'BUY', marketItemId: 'coffee' }],
        }),
      ]
    })
    const result = await shop.buy(player.id, buy())
    expect(result.player.world.currency).toBe(0)
    expect(result.player.quests[0].status).toBe('ready')
    await expect(shop.buy(player.id, buy())).rejects.toThrow(
      'insufficient_funds'
    )
  })

  it('consumes once, persists timed effects, and protects reserved copies', async () => {
    await fx.db.mutatePlayer(player.id, (save) => {
      save.world.inventory = { coffee: 2, banana: 1 }
      save.quests = [
        createQuest({
          giverNpcId: 'hoa',
          title: 'Deliver coffee',
          description: 'Take one coffee to Linh.',
          scope: 'solo',
          steps: [{ type: 'BRING', itemId: 'coffee', npcId: 'linh' }],
        }),
      ]
    })
    const input = {
      requestId: randomUUID(),
      itemId: 'coffee' as const,
      events: [],
    }
    const used = await shop.use(player.id, input)
    expect(used.player.world.effects).toEqual([
      { itemId: 'coffee', endsAt: now + 180_000 },
    ])
    expect(
      (await shop.use(player.id, input)).player.world.inventory.coffee
    ).toBe(1)
    await expect(
      shop.use(player.id, { ...input, requestId: randomUUID() })
    ).rejects.toThrow('item_reserved')
    const banana = await shop.use(player.id, {
      requestId: randomUUID(),
      itemId: 'banana',
      events: [],
    })
    expect(banana.receipt.restore).toBe(40)
    expect(banana.player.world.inventory.banana).toBe(0)
  })

  it('allows every player their own rare copy and rejects expired or already owned offers', async () => {
    const second = (await fx.guest()).player
    const room = rooms.connect(second, { send() {}, close() {} })
    const other = rooms.getPlayer(second.id)
    if (!other) throw new Error('missing_presence')
    other.position = [...NPC_POSITIONS.mai]
    other.ride = null
    for (const id of [player.id, second.id])
      await fx.db.mutatePlayer(id, (save) => {
        save.world.currency = 1600
      })
    room.city.apply({
      type: 'start-rare-sale',
      npcId: 'mai',
      unlockId: 'lacquer-non-la',
    })
    const offerId = room.city.snapshot().rareOffer?.id
    if (!offerId) throw new Error('missing_offer')
    const input = {
      requestId: randomUUID(),
      npcId: 'mai' as const,
      offerId,
      events: [],
    }
    const [first, next] = await Promise.all([
      shop.buy(player.id, input),
      shop.buy(second.id, { ...input, requestId: randomUUID() }),
    ])
    for (const result of [first, next]) {
      expect(result.player.unlocks.owned).toContain('lacquer-non-la')
      expect(result.player.world.currency).toBe(800)
    }
    await expect(
      shop.buy(player.id, { ...input, requestId: randomUUID() })
    ).rejects.toThrow('already_owned')
    now += 600_000
    expect((await shop.buy(player.id, input)).receipt).toEqual(first.receipt)
    await expect(
      shop.buy(player.id, { ...input, requestId: randomUUID() })
    ).rejects.toThrow('offer_expired')
  })

  it('rejects forged purchase events and clears receipts on journey reset', async () => {
    const events = [
      {
        type: 'purchase' as const,
        itemId: 'coffee' as const,
        credit: true as const,
      },
    ]
    await expect(shop.buy(player.id, { ...buy(), events })).rejects.toThrow(
      'purchase_event_forbidden'
    )
    await expect(
      rooms.processEvents(player.id, 1, events, new QuestService(fx.db))
    ).rejects.toThrow('purchase_event_forbidden')
    const input = buy()
    await shop.buy(player.id, input)
    await fx.db.reset(player.id)
    expect(
      (await shop.buy(player.id, input)).player.world.inventory.coffee
    ).toBe(1)
  })
})

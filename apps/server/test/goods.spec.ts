import {
  consumeGood,
  createQuest,
  GIVER_UNLOCKS,
  initialCity,
  MARKET_ITEMS,
  merchantFor,
  NPC_SHOPS,
  RARE_WEARABLES,
  reservedQuantity,
  selectUnlock,
  staminaModifiers,
  WorldStateSchema,
} from '@saigon/shared'
import { describe, expect, it } from 'vitest'

const fresh = () =>
  WorldStateSchema.parse({
    locationId: 'market',
    inventory: { coffee: 3, banana: 2, baguette: 1, pho: 2 },
    visitedLocations: ['market'],
    talkedTo: [],
    deliveredItems: [],
    completedQuestIds: [],
    currency: 30,
  })
const delivery = () =>
  createQuest({
    giverNpcId: 'mai',
    title: 'Coffee for a neighbor',
    description: 'Carry coffee to Hoa.',
    scope: 'solo',
    steps: [{ type: 'DELIVER', itemId: 'coffee', npcId: 'hoa' }],
  })

describe('merchant goods and stamina effects', () => {
  it('has one authored merchant per good and preserves the original prices', () => {
    for (const id of Object.keys(
      MARKET_ITEMS
    ) as (keyof typeof MARKET_ITEMS)[]) {
      expect(NPC_SHOPS[merchantFor(id)]).toContain(id)
      expect(
        Object.values(NPC_SHOPS).filter((stock) => stock.includes(id))
      ).toHaveLength(1)
    }
    expect(MARKET_ITEMS.coffee.price).toBe(3)
    expect(MARKET_ITEMS.banana.price).toBe(2)
    expect(merchantFor('baguette')).toBe('bread-vendor')
    expect(merchantFor('pho')).toBe('hoa')
  })

  it('accepts legacy saves without effects and starts with baseline modifiers', () => {
    expect(fresh().effects).toBeUndefined()
    expect(staminaModifiers()).toEqual({
      max: 100,
      drain: 100 / 12,
      regen: 12.5,
      unlimited: false,
    })
    expect(initialCity().rareOffer).toBeUndefined()
  })

  it('reserves every outstanding delivery and consumes only surplus', () => {
    const quests = [delivery(), delivery()]
    const world = fresh()
    expect(reservedQuantity(quests, 'coffee')).toBe(2)
    const result = consumeGood(world, quests, 'coffee', 1000)
    expect('world' in result && result.world.inventory.coffee).toBe(2)
    if (!('world' in result)) throw new Error('Expected surplus')
    expect(consumeGood(result.world, quests, 'coffee', 1000)).toEqual({
      error: 'item_reserved',
    })
    expect(world.inventory.coffee).toBe(3)
    quests[0].progress[0] = true
    expect(reservedQuantity(quests, 'coffee')).toBe(1)
  })

  it('does not consume missing items or quest ingredients', () => {
    const world = fresh()
    world.inventory.banana = 0
    expect(consumeGood(world, [], 'banana')).toEqual({
      error: 'item_not_owned',
    })
    world.inventory.noodles = 2
    const result = consumeGood(world, [], 'pho', 1000)
    expect('world' in result && result.world.inventory.noodles).toBe(2)
  })

  it('combines timed effects, refreshes rather than stacks, and expires exactly', () => {
    let world = fresh()
    for (const item of ['coffee', 'baguette', 'pho', 'coffee'] as const) {
      const result = consumeGood(world, [], item, 1000)
      if (!('world' in result)) throw new Error(result.error)
      world = result.world
    }
    expect(world.effects).toHaveLength(3)
    expect(staminaModifiers(world.effects, 180999)).toEqual({
      max: 150,
      drain: 0,
      regen: 18.75,
      unlimited: true,
    })
    expect(staminaModifiers(world.effects, 181000)).toEqual({
      max: 100,
      drain: 100 / 12,
      regen: 12.5,
      unlimited: false,
    })
    const refreshed = consumeGood(world, [], 'coffee', 2000)
    expect(
      'world' in refreshed &&
        refreshed.world.effects?.find((e) => e.itemId === 'coffee')?.endsAt
    ).toBe(182000)
  })

  it('returns instantaneous recovery without introducing a banana buff', () => {
    const banana = consumeGood(fresh(), [], 'banana', 1000)
    expect('world' in banana && banana.restore).toBe(40)
    expect('world' in banana && banana.world.effects).toEqual([])
    const pho = consumeGood(fresh(), [], 'pho', 1000)
    expect('world' in pho && pho.restore).toBe(50)
  })
})

describe('shop-exclusive wardrobe collection', () => {
  it('keeps all three rare items out of every friendship reward sequence', () => {
    expect(Object.values(RARE_WEARABLES).map((item) => item.price)).toEqual([
      800, 1100, 1500,
    ])
    const rareIds = Object.keys(RARE_WEARABLES)
    for (const [giver, ids] of Object.entries(GIVER_UNLOCKS)) {
      expect(ids).toHaveLength(3)
      expect(ids.some((id) => rareIds.includes(id))).toBe(false)
      expect(rareIds).not.toContain(
        selectUnlock(giver as keyof typeof GIVER_UNLOCKS, {
          owned: [],
          promised: [],
          friendship: 5,
        })
      )
    }
  })
})

import {
  advance,
  applyQuestEvents,
  createQuest,
  isReady,
  QUEST_DOMAINS,
  QUEST_SEEDS,
  type QuestSpec,
  rewardFor,
  seedsFor,
  validateSpec,
  type WorldState,
  WorldStateSchema,
} from '@saigon/shared'
import { describe, expect, it } from 'vitest'

const seed = () => seedsFor('hoa')[0] as QuestSpec
const world = (): WorldState => ({
  locationId: 'market',
  inventory: {},
  visitedLocations: ['market'],
  talkedTo: [],
  deliveredItems: [],
  completedQuestIds: [],
  currency: 30,
})

describe('quest engine', () => {
  it('validates an offline seed for every persona', () => {
    expect(new Set(QUEST_SEEDS.map((spec) => spec.giverNpcId)).size).toBe(9)
    for (const spec of QUEST_SEEDS)
      expect(validateSpec(spec, { quests: [] })).toEqual({ ok: true, spec })
  })

  it('rejects unknown entities, extra fields, empty and oversized steps', () => {
    for (const spec of [
      { ...seed(), reward: { currency: 100 } },
      { ...seed(), steps: [] },
      { ...seed(), steps: Array(4).fill(seed().steps[0]) },
      { ...seed(), steps: [{ type: 'GO_TO', locationId: 'moon' }] },
      { ...seed(), steps: [{ type: 'COLLECT', itemId: 'herbs', count: 1 }] },
    ])
      expect(validateSpec(spec, { quests: [] }).ok).toBe(false)
  })

  it('returns actionable self-delivery and domain rejection reasons', () => {
    expect(
      validateSpec(
        {
          ...seed(),
          steps: [{ type: 'DELIVER', itemId: 'herbs', npcId: 'hoa' }],
        },
        { quests: [] }
      )
    ).toEqual({ ok: false, reason: 'self_delivery' })
    expect(
      validateSpec(
        {
          ...seed(),
          steps: [{ type: 'GO_TO', locationId: 'postoffice' }],
        },
        { quests: [] }
      )
    ).toEqual({
      ok: false,
      reason: 'out_of_domain:location:postoffice',
    })
    expect(
      validateSpec(
        {
          ...seed(),
          steps: [{ type: 'DELIVER', itemId: 'photo', npcId: 'linh' }],
        },
        { quests: [] }
      )
    ).toEqual({
      ok: false,
      reason: 'out_of_domain:item:photo',
    })
  })

  it('rejects duplicate active steps and enforces the three-quest cap', () => {
    const quest = createQuest(seed())
    expect(
      validateSpec(
        { ...seed(), title: 'A renamed duplicate' },
        {
          quests: [quest],
        }
      )
    ).toEqual({ ok: false, reason: 'duplicate_active_quest' })
    expect(
      validateSpec(seedsFor('tam')[0], {
        quests: [quest, quest, quest],
      })
    ).toEqual({ ok: false, reason: 'cap_reached:maximum_3_active_quests' })
    expect(
      validateSpec(
        { ...seed(), scope: 'party' },
        {
          quests: [],
        }
      )
    ).toEqual({ ok: false, reason: 'party_required' })
  })
  it('rejects repeated primitives but permits distinct actions at the same target', () => {
    expect(
      validateSpec(
        {
          ...seed(),
          steps: [
            { type: 'TALK_TO', npcId: 'linh' },
            { type: 'TALK_TO', npcId: 'linh' },
          ],
        },
        { quests: [] }
      )
    ).toEqual({ ok: false, reason: 'duplicate_step' })
    expect(
      validateSpec(
        {
          ...seed(),
          steps: [
            { type: 'TALK_TO', npcId: 'linh' },
            { type: 'DELIVER', npcId: 'linh', itemId: 'herbs' },
          ],
        },
        { quests: [] }
      ).ok
    ).toBe(true)
  })

  it('computes bounded rewards and uses only persona gifts', () => {
    for (const spec of QUEST_SEEDS) {
      const reward = rewardFor(spec)
      expect(reward.currency).toBeLessThanOrEqual(100)
      expect(reward.currency).toBeGreaterThanOrEqual(0)
      expect(QUEST_DOMAINS[spec.giverNpcId].gifts).toContain(reward.itemId)
      expect([1, 2]).toContain(reward.reputation)
    }
    const long = {
      ...seed(),
      steps: Array(10).fill({ type: 'GO_TO', locationId: 'postoffice' }),
    } as QuestSpec
    expect(rewardFor(long).currency).toBe(100)
  })

  it('advances sequentially and needs fresh events after offer', () => {
    const spec: QuestSpec = {
      ...seed(),
      steps: [
        { type: 'GO_TO', locationId: 'park' },
        { type: 'TALK_TO', npcId: 'linh' },
      ],
    }
    const initial = createQuest(spec)
    expect(isReady(initial)).toBe(false)
    const outOfOrder = advance(initial, { type: 'talk', npcId: 'linh' })
    expect(outOfOrder.progress).toEqual([false, false])
    const arrived = advance(initial, { type: 'visit', locationId: 'park' })
    expect(arrived.progress).toEqual([true, false])
    const ready = advance(arrived, { type: 'talk', npcId: 'linh' })
    expect(ready.status).toBe('ready')
    expect(isReady(ready)).toBe(true)
    expect(initial.progress).toEqual([false, false])
  })

  it('rejects unaffordable purchases and missing delivery items', () => {
    const purchase = createQuest({
      ...seed(),
      steps: [{ type: 'BUY', marketItemId: 'coffee' }],
    })
    const delivery = createQuest(seed())
    const rejected = applyQuestEvents(
      { ...world(), currency: 0 },
      [purchase, delivery],
      [
        { type: 'purchase', itemId: 'coffee' },
        { type: 'deliver', itemId: 'herbs', npcId: 'linh' },
      ]
    )
    expect(rejected.quests.map((quest) => quest.status)).toEqual([
      'active',
      'active',
    ])
    expect(rejected.world.inventory).toEqual({})
    const accepted = applyQuestEvents(
      world(),
      [purchase],
      [{ type: 'purchase', itemId: 'coffee' }]
    )
    expect(accepted.quests[0]?.status).toBe('ready')
    expect(accepted.world.currency).toBe(27)
  })
  it('rejects a purchase when that inventory item is already full', () => {
    const quest = createQuest({
      ...seed(),
      steps: [{ type: 'BUY', marketItemId: 'coffee' }],
    })
    const result = applyQuestEvents(
      { ...world(), inventory: { coffee: 100 } },
      [quest],
      [{ type: 'purchase', itemId: 'coffee' }]
    )
    expect(result.world.inventory.coffee).toBe(100)
    expect(result.world.currency).toBe(30)
    expect(result.quests[0]?.status).toBe('active')
    expect(WorldStateSchema.safeParse(result.world).success).toBe(true)
  })

  it('accepts banana delivery and future deliveries to the same neighbor', () => {
    const original = {
      ...world(),
      inventory: { banana: 2 },
      deliveredItems: ['banana:linh' as const],
    }
    const banana = createQuest({
      ...seed(),
      steps: [{ type: 'DELIVER', itemId: 'banana', npcId: 'linh' }],
    })
    const result = applyQuestEvents(
      original,
      [banana],
      [{ type: 'deliver', itemId: 'banana', npcId: 'linh' }]
    )
    expect(result.world.inventory.banana).toBe(1)
    expect(result.quests[0]?.status).toBe('ready')
    expect(WorldStateSchema.safeParse(result.world).success).toBe(true)
  })
})

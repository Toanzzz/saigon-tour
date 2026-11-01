import {
  createQuest,
  EMPTY_UNLOCKS,
  FRIENDSHIP_TIERS,
  GIVER_UNLOCKS,
  type QuestSpec,
  RewardSchema,
  rewardFor,
  seedsFor,
  selectUnlock,
  UNLOCKS,
  UnlocksSchema,
} from '@saigon/shared'
import { describe, expect, it } from 'vitest'

const NEIGHBORS = [
  'hoa',
  'tam',
  'linh',
  'ba',
  'mai',
  'alex',
  'vy',
  'son',
  'thao',
] as const
const seed = (giver: (typeof NEIGHBORS)[number]) =>
  seedsFor(giver)[0] as QuestSpec

describe('unlock catalog', () => {
  it('gives every neighbour three tiered signature unlocks', () => {
    for (const giver of NEIGHBORS) {
      const ids = GIVER_UNLOCKS[giver]
      expect(ids).toHaveLength(3)
      expect(ids.map((id) => UNLOCKS[id].tier)).toEqual([
        'neutral',
        'warm',
        'close',
      ])
      for (const id of ids) expect(UNLOCKS[id].giver).toBe(giver)
    }
  })

  it('keeps all vehicle speeds below the bus', () => {
    for (const entry of Object.values(UNLOCKS))
      if (entry.kind === 'vehicle') expect(entry.speed).toBeLessThan(10)
  })
})

describe('selectUnlock', () => {
  it('picks the giver first unlock allowed by the current tier', () => {
    const neutral = selectUnlock('hoa', {
      owned: [],
      promised: [],
      friendship: FRIENDSHIP_TIERS.neutral,
    })
    expect(neutral).toBe(GIVER_UNLOCKS.hoa[0])
  })

  it('gates higher tiers behind friendship', () => {
    const warmId = GIVER_UNLOCKS.hoa[1]
    const neutralId = GIVER_UNLOCKS.hoa[0]
    const atWarm = selectUnlock('hoa', {
      owned: [neutralId],
      promised: [],
      friendship: FRIENDSHIP_TIERS.warm,
    })
    expect(atWarm).toBe(warmId)
    const blocked = selectUnlock('hoa', {
      owned: [neutralId],
      promised: [],
      friendship: FRIENDSHIP_TIERS.warm - 1,
    })
    expect(blocked).toBeUndefined()
  })

  it('skips owned and promised unlocks', () => {
    const [neutralId, warmId] = GIVER_UNLOCKS.tam
    const picked = selectUnlock('tam', {
      owned: [neutralId],
      promised: [warmId],
      friendship: FRIENDSHIP_TIERS.close,
    })
    expect(picked).toBe(GIVER_UNLOCKS.tam[2])
  })
})

describe('rewardFor unlock wiring', () => {
  it('omits unlockId when no context is given (legacy callers)', () => {
    const reward = rewardFor(seed('hoa'))
    expect(reward.unlockId).toBeUndefined()
  })

  it('attaches the selected unlock when context is given', () => {
    const quest = createQuest(seed('hoa'), undefined, undefined, {
      owned: [],
      promised: [],
      friendship: FRIENDSHIP_TIERS.neutral,
    })
    expect(quest.reward.unlockId).toBe(GIVER_UNLOCKS.hoa[0])
  })
})

describe('schema compatibility', () => {
  it('parses a reward with no unlockId', () => {
    expect(
      RewardSchema.safeParse({ currency: 10, itemId: null, reputation: 1 })
        .success
    ).toBe(true)
  })

  it('defaults empty unlocks', () => {
    expect(UnlocksSchema.parse(undefined ?? {})).toEqual(EMPTY_UNLOCKS)
  })
})

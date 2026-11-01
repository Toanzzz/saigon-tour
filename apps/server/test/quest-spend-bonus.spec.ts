import {
  advance,
  applyQuestEvents,
  completionBonus,
  createQuest,
  parFare,
  type Quest,
  type QuestSpec,
  type WorldState,
} from '@saigon/shared'
import { describe, expect, it } from 'vitest'

const now = 2_000_000
const world = (over: Partial<WorldState> = {}): WorldState => ({
  locationId: 'market',
  inventory: {},
  visitedLocations: ['market'],
  talkedTo: [],
  deliveredItems: [],
  completedQuestIds: [],
  currency: 30,
  ...over,
})

const riddleSpec: QuestSpec = {
  giverNpcId: 'thao',
  title: 'Riddle',
  description: 'Hidden first step.',
  scope: 'solo',
  steps: [
    { type: 'TALK_TO', npcId: 'son' },
    { type: 'TALK_TO', npcId: 'vy' },
  ],
  riddle: { text: 'Find the one who kept your bridge.' },
}

describe('ride spend', () => {
  it('accrues spent on active and ready quests', () => {
    const quest = createQuest(riddleSpec, 'q_sp1', now)
    const after = advance(quest, { type: 'spend', amount: 3 }, now)
    expect(after.spent).toBe(3)
    const ready = { ...after, status: 'ready' as const }
    expect(advance(ready, { type: 'spend', amount: 5 }, now).spent).toBe(8)
  })

  it('marks the riddle revealed on a cyclo ride', () => {
    const quest = createQuest(riddleSpec, 'q_sp2', now)
    const after = advance(
      quest,
      { type: 'spend', amount: 3, mode: 'cyclo' },
      now
    )
    expect(after.revealed).toBe('cyclo')
    const other = advance(
      quest,
      { type: 'spend', amount: 8, mode: 'xeom' },
      now
    )
    expect(other.revealed).toBeUndefined()
  })
})

const buySpec: QuestSpec = {
  giverNpcId: 'mai',
  title: 'Buy',
  description: 'Buy coffee for Hoa.',
  scope: 'solo',
  steps: [{ type: 'BUY', marketItemId: 'coffee' }],
}

describe('market credit', () => {
  it('applies only for an unaffordable quest BUY', () => {
    const quest = createQuest(buySpec, 'q_c1', now)
    // Broke player, credit flag, next step is BUY coffee -> free item.
    const credited = applyQuestEvents(
      world({ currency: 0 }),
      [quest],
      [{ type: 'purchase', itemId: 'coffee', credit: true }]
    )
    expect(credited.world.inventory.coffee).toBe(1)
    expect(credited.world.currency).toBe(0)
    expect(credited.quests[0]?.status).toBe('ready')
  })

  it('does not credit when the player can afford it', () => {
    const quest = createQuest(buySpec, 'q_c2', now)
    const paid = applyQuestEvents(
      world({ currency: 30 }),
      [quest],
      [{ type: 'purchase', itemId: 'coffee', credit: true }]
    )
    expect(paid.world.currency).toBe(27)
    expect(paid.world.inventory.coffee).toBe(1)
  })

  it('does not credit without a matching quest BUY', () => {
    const credited = applyQuestEvents(
      world({ currency: 0 }),
      [],
      [{ type: 'purchase', itemId: 'coffee', credit: true }]
    )
    expect(credited.world.inventory.coffee ?? 0).toBe(0)
  })
})

describe('completion bonus', () => {
  const thriftyNear: QuestSpec = {
    giverNpcId: 'hoa',
    title: 'Near',
    description: 'Short errand.',
    scope: 'solo',
    steps: [{ type: 'TALK_TO', npcId: 'linh' }],
  }

  it('awards thrifty when spent <= par', () => {
    const quest = createQuest(thriftyNear, 'q_b1', now)
    expect(parFare(quest)).toBe(0)
    expect(completionBonus(quest).thrifty).toBe(5)
    const spent = { ...quest, spent: 1 }
    expect(completionBonus(spent).thrifty).toBeUndefined()
  })

  it('awards sharp only when solved', () => {
    const quest: Quest = {
      ...createQuest(riddleSpec, 'q_b2', now),
      revealed: 'solved',
    }
    expect(completionBonus(quest).sharp).toBe(5)
    const talk: Quest = { ...quest, revealed: 'talk' }
    expect(completionBonus(talk).sharp).toBeUndefined()
  })

  it('counts a long leg as 3 par coins', () => {
    const far: QuestSpec = {
      giverNpcId: 'hoa',
      title: 'Far',
      description: 'A long haul.',
      scope: 'solo',
      steps: [{ type: 'GO_TO', locationId: 'cityhall' }],
    }
    const quest = createQuest(far, 'q_b3', now)
    expect(parFare(quest)).toBe(6)
  })
})

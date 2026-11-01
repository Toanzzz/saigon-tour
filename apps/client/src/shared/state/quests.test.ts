import type { Quest } from '@saigon/shared'
import { describe, expect, it } from 'vitest'
import { initialState } from './game'
import { dialogueQuests } from './quests'

function quest(overrides: Partial<Quest>): Quest {
  return {
    id: 'q_test',
    giverNpcId: 'hoa',
    title: 'Fresh herbs for a neighbor',
    description: 'Bring these fresh herbs to Chị Linh in the park.',
    steps: [{ type: 'DELIVER', itemId: 'herbs', npcId: 'linh' }],
    scope: 'solo',
    reward: { currency: 10, itemId: null, reputation: 1 },
    progress: [false],
    status: 'active',
    createdAt: 0,
    ...overrides,
  }
}

function withQuests(quests: Quest[], inventory: Record<string, number> = {}) {
  const state = initialState()
  return {
    ...state,
    quests,
    world: { ...state.world, inventory },
  }
}

describe('dialogueQuests', () => {
  it('returns empty collections when the player has no quests', () => {
    const result = dialogueQuests(withQuests([]), 'hoa')
    expect(result.fromNpc).toEqual([])
    expect(result.forNpc).toEqual([])
    expect(result.ready).toBe(false)
    expect(result.delivery).toBeUndefined()
    expect(result.canHelp).toBe(true)
    expect(result.full).toBe(false)
  })

  it('lists active quests this NPC gave under fromNpc', () => {
    const q = quest({ id: 'q_from', giverNpcId: 'hoa', status: 'active' })
    const result = dialogueQuests(withQuests([q]), 'hoa')
    expect(result.fromNpc.map((entry) => entry.id)).toEqual(['q_from'])
    expect(result.forNpc).toEqual([])
    expect(result.ready).toBe(false)
  })

  it('lists quests whose next step targets this NPC under forNpc', () => {
    const q = quest({
      id: 'q_for',
      giverNpcId: 'tam',
      steps: [{ type: 'DELIVER', itemId: 'herbs', npcId: 'linh' }],
      progress: [false],
    })
    const result = dialogueQuests(withQuests([q]), 'linh')
    expect(result.forNpc.map((entry) => entry.id)).toEqual(['q_for'])
    expect(result.delivery).toBeUndefined()
  })

  it('surfaces the deliverable step when the item is in the bag', () => {
    const q = quest({
      id: 'q_for',
      giverNpcId: 'tam',
      steps: [{ type: 'DELIVER', itemId: 'herbs', npcId: 'linh' }],
      progress: [false],
    })
    const result = dialogueQuests(withQuests([q], { herbs: 1 }), 'linh')
    expect(result.delivery?.type).toBe('DELIVER')
    expect(result.forNpc.map((entry) => entry.id)).toEqual(['q_for'])
  })

  it('flags a ready quest this NPC gave', () => {
    const q = quest({ id: 'q_ready', giverNpcId: 'hoa', status: 'ready' })
    const result = dialogueQuests(withQuests([q]), 'hoa')
    expect(result.ready).toBe(true)
    expect(result.fromNpc.map((entry) => entry.id)).toEqual(['q_ready'])
  })

  it('marks the journal full at the three-quest cap', () => {
    const quests = ['q_a', 'q_b', 'q_c'].map((id) =>
      quest({ id, giverNpcId: 'tam', status: 'active' })
    )
    const result = dialogueQuests(withQuests(quests), 'hoa')
    expect(result.canHelp).toBe(false)
    expect(result.full).toBe(true)
  })
})

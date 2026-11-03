import {
  createQuest,
  milestoneSeeds,
  type NpcId,
  type Quest,
} from '@saigon/shared'
import { describe, expect, it } from 'vitest'
import { type InteractBody, offline } from '@/shared/api/agent'
import { initialState } from '@/shared/state/game'
import { canAskMilestone } from '@/shared/state/quests'
import { completedFixture } from './quest-fixture'

const request = (npc: NpcId): InteractBody => ({
  message: '',
  intent: 'milestone',
  events: [],
  worldContext: {
    playerLocation: npc === 'vy' ? 'cityhall' : 'market',
    nearbyNpcs: [npc],
    timeOfDay: 'evening',
  },
})
const seed = (npc: NpcId): Quest => {
  const spec = milestoneSeeds(npc)[0]
  if (!spec) throw new Error(`Missing milestone seed for ${npc}`)
  return createQuest(spec, `q_milestone_${npc}`)
}

describe('milestone completion history', () => {
  it('keeps later component errands available after an old component completion', () => {
    const completed = {
      ...completedFixture(seed('mai')),
      milestone: 'evening-concert' as const,
    }
    const state = { ...initialState(), completed: [completed] }
    expect(canAskMilestone(state, 'thao')).toBe(true)
    const result = offline('thao', request('thao'), state)
    expect(result.questEvents).toContainEqual(
      expect.objectContaining({
        type: 'offered',
        quest: expect.objectContaining({
          giverNpcId: 'thao',
          gift: 'sheet-music',
        }),
      })
    )
  })

  it('offers the finale when all components are held and earlier errands are recorded', () => {
    const state = {
      ...initialState(),
      completed: ['mai', 'thao', 'ba'].map((npc) => ({
        ...completedFixture(seed(npc as NpcId)),
        milestone: 'evening-concert' as const,
      })),
      world: {
        ...initialState().world,
        inventory: { 'coffee-beans': 1, 'sheet-music': 1, lanterns: 1 },
      },
    }
    const result = offline('vy', request('vy'), state)
    expect(result.questEvents).toContainEqual(
      expect.objectContaining({
        type: 'offered',
        quest: expect.objectContaining({
          giverNpcId: 'vy',
          reward: expect.objectContaining({ currency: 90, reputation: 5 }),
        }),
      })
    )
  })

  it('blocks component offers only after the host finale was completed', () => {
    const state = {
      ...initialState(),
      completed: [
        {
          ...completedFixture(seed('vy')),
          milestone: 'evening-concert' as const,
        },
      ],
    }
    expect(canAskMilestone(state, 'thao')).toBe(false)
    expect(offline('thao', request('thao'), state).questEvents).toEqual([])
  })
})

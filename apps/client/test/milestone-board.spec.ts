import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { InteractBody } from '@/shared/api/agent'
import { offline } from '@/shared/api/agent'
import { saveToken } from '@/shared/api/transport'
import { initialState } from '@/shared/state/game'
import { canAskMilestone } from '@/shared/state/quests'
import { hubView, milestoneBoard } from '@/widgets/hub'

function body(intent: InteractBody['intent']): InteractBody {
  return {
    message: '',
    intent,
    events: [],
    worldContext: {
      playerLocation: 'cityhall',
      nearbyNpcs: [],
      timeOfDay: 'evening',
    },
  }
}

describe('milestone board derivation', () => {
  it('starts in gather state with no components held', () => {
    const board = milestoneBoard(initialState())
    expect(board.state).toBe('gather')
    expect(board.components).toHaveLength(3)
    expect(board.components.every((c) => !c.held)).toBe(true)
    // Next suggested giver is the first component's giver (Mai).
    expect(board.nextGiver).toBe('mai')
    expect(board.host).toBe('vy')
  })

  it('turns ready once all three are held, done once completed', () => {
    const held = initialState()
    held.world.inventory = {
      ...held.world.inventory,
      'coffee-beans': 1,
      'sheet-music': 1,
      lanterns: 1,
    }
    const ready = milestoneBoard(held)
    expect(ready.state).toBe('ready')
    expect(ready.nextGiver).toBeNull()

    const done = initialState()
    done.completed = [
      {
        id: 'q_done',
        title: 'The evening concert at City Hall',
        giverNpcId: 'vy',
        reward: { currency: 0, itemId: null, reputation: 0 },
        completedAt: 1,
        milestone: 'evening-concert',
      },
    ]
    const board = milestoneBoard(done)
    expect(board.state).toBe('done')
    expect(hubView(done).milestone.state).toBe('done')
  })
})

describe('ask-about-the-concert button', () => {
  it('shows for a component giver until held, hidden once held or completed', () => {
    const state = initialState()
    expect(canAskMilestone(state, 'mai')).toBe(true)
    // Not a component giver.
    expect(canAskMilestone(state, 'hoa')).toBe(false)
    // Already holds the component.
    const holding = initialState()
    holding.world.inventory = { ...holding.world.inventory, 'coffee-beans': 1 }
    expect(canAskMilestone(holding, 'mai')).toBe(false)
  })
})

describe('offline milestone offers', () => {
  beforeEach(() => {
    saveToken('offline-test-token')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
  })
  afterEach(() => vi.unstubAllGlobals())

  it('offers a component errand on the milestone intent', () => {
    const response = offline('mai', body('milestone'), initialState())
    const offered = response.questEvents.find((e) => e.type === 'offered')
    expect(offered?.quest.milestone).toBe('evening-concert')
    expect(offered?.quest.gift).toBe('coffee-beans')
  })

  it('auto-offers the apex to the host when all three are held', () => {
    const state = initialState()
    state.world.inventory = {
      ...state.world.inventory,
      'coffee-beans': 1,
      'sheet-music': 1,
      lanterns: 1,
    }
    const response = offline('vy', body('chat'), state)
    const offered = response.questEvents.find((e) => e.type === 'offered')
    expect(offered?.quest.milestone).toBe('evening-concert')
    expect(offered?.quest.steps.every((s) => s.type === 'BRING')).toBe(true)
  })
})

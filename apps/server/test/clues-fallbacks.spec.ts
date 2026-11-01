import {
  createQuest,
  type Quest,
  RIDDLE_REVEAL_MS,
  stepText,
} from '@saigon/shared'
import { describe, expect, it } from 'vitest'
import { fallbackLine, offeredErrandLine } from '@/features/npc/fallbacks'

const world = {
  currency: 0,
  inventory: {},
  locationId: 'market' as const,
  visitedLocations: [],
  talkedTo: [],
  deliveredItems: [],
  completedQuestIds: [],
}

/** An active hoa quest whose next step is a DELIVER to Linh in the park. */
function deliverQuest(): Quest {
  return createQuest(
    {
      giverNpcId: 'hoa',
      title: 'Fresh herbs',
      description: 'Bring herbs to Linh.',
      scope: 'solo',
      steps: [{ type: 'DELIVER', itemId: 'herbs', npcId: 'linh' }],
    },
    'q_incomplete',
    1_000_000
  )
}

describe('3a concrete incomplete fallback', () => {
  it('names the next step and its place in English', () => {
    const quest = deliverQuest()
    const line = fallbackLine('hoa', world, 'incomplete', 'en', 0, [quest])
    expect(line).toContain(stepText(quest.steps[0], 'en'))
    expect(line).toContain('Linh')
    // Concrete, not the generic "check your journal" copy.
    expect(line).not.toBe(
      'There is still something to do. Check the steps in your journal, then come back.'
    )
  })
  it('names the next step and its place in Vietnamese', () => {
    const quest = deliverQuest()
    const line = fallbackLine('hoa', world, 'incomplete', 'vi', 0, [quest])
    expect(line).toContain(stepText(quest.steps[0], 'vi'))
  })
  it('falls back to the generic line when nothing is pending', () => {
    const line = fallbackLine('hoa', world, 'incomplete', 'en', 0, [])
    expect(line).toContain('journal')
  })
})

describe('3b riddle incomplete fallback hides the answer', () => {
  /** An active riddle quest whose hidden step 0 is GO_TO cathedral. */
  function riddleQuest(): Quest {
    return createQuest(
      {
        giverNpcId: 'thao',
        title: 'Where the echo lives',
        description: 'A riddle for the opening step.',
        scope: 'solo',
        steps: [{ type: 'GO_TO', locationId: 'cathedral' }],
        riddle: { text: 'Two towers of red brick keep the square its echo.' },
      },
      'q_riddle',
      1_000_000
    )
  }
  it('never names the hidden riddle answer while unrevealed', () => {
    const quest = riddleQuest()
    const now = quest.createdAt + 1000 // well before the 4-minute reveal
    const line = fallbackLine(
      'thao',
      world,
      'incomplete',
      'en',
      0,
      [quest],
      now
    )
    // The authored answer (the cathedral step text) must not leak.
    expect(line).not.toContain(stepText(quest.steps[0], 'en'))
    // Falls through to the generic line since the only quest is hidden.
    expect(line).toContain('journal')
  })
  it('names the step once the riddle is revealed', () => {
    const quest: Quest = { ...riddleQuest(), revealed: 'solved' }
    const now = quest.createdAt + 1000
    const line = fallbackLine(
      'thao',
      world,
      'incomplete',
      'en',
      0,
      [quest],
      now
    )
    expect(line).toContain(stepText(quest.steps[0], 'en'))
  })
  it('names the step after the four-minute timer', () => {
    const quest = riddleQuest()
    const now = quest.createdAt + RIDDLE_REVEAL_MS
    const line = fallbackLine(
      'thao',
      world,
      'incomplete',
      'en',
      0,
      [quest],
      now
    )
    expect(line).toContain(stepText(quest.steps[0], 'en'))
  })
})

describe('stepText reads both locales', () => {
  it('names a landmark for GO_TO', () => {
    expect(
      stepText({ type: 'GO_TO', locationId: 'cathedral' }, 'en')
    ).toContain('Notre-Dame')
    expect(
      stepText({ type: 'GO_TO', locationId: 'cathedral' }, 'vi')
    ).toContain('Nhà thờ')
  })
  it('names the neighbor and place for a people step', () => {
    const line = stepText({ type: 'TALK_TO', npcId: 'vy' }, 'en')
    expect(line).toContain('Vy')
  })
})

describe('offered errand line describes the errand in chat', () => {
  it('names the setup and concrete first step, not journal boilerplate', () => {
    const quest = deliverQuest()
    const line = offeredErrandLine(quest, 'en')
    expect(line).toContain('Bring herbs to Linh.')
    expect(line).toContain(stepText(quest.steps[0], 'en'))
    expect(line).not.toContain('journal')
  })
  it('keeps a hidden riddle step out of the offer', () => {
    const quest = createQuest(
      {
        giverNpcId: 'hoa',
        title: 'Riddle run',
        description: 'Solve my riddle first.',
        scope: 'solo',
        steps: [
          { type: 'GO_TO', locationId: 'park' },
          { type: 'DELIVER', itemId: 'herbs', npcId: 'linh' },
        ],
        riddle: { text: 'Where the fountain sings.' },
      },
      'q_riddle',
      1_000_000
    )
    const line = offeredErrandLine(quest, 'en', 1_000_000)
    expect(line).toBe('Solve my riddle first.')
    expect(line).not.toContain(stepText(quest.steps[0], 'en'))
  })
})

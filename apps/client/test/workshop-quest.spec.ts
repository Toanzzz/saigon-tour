import { describe, expect, it } from 'vitest'
import {
  advancePreview,
  inspectorSeeds,
  inspectQuest,
  inspectWardrobe,
  replayCompletion,
  workshop,
} from '@/features/workshop/store'

describe('quest inspector engine parity', () => {
  it('applies the twist when selecting a ready fixture', () => {
    inspectQuest({ npc: 'hoa', seed: 0, phase: 'ready' })
    const quest = workshop.state.quest
    expect(quest.status).toBe('ready')
    expect(quest.progress).toEqual([true, true, true])
    expect(quest.steps.at(-1)).toEqual({
      type: 'DELIVER',
      itemId: 'broth',
      npcId: 'vy',
    })
    expect(quest.twist?.replaced).toEqual({
      type: 'DELIVER',
      itemId: 'broth',
      npcId: 'linh',
    })
  })

  it('keeps revealed riddle state and sharp rewards when replaying completion', () => {
    const index = inspectorSeeds('alex', 'en').findIndex((quest) =>
      Boolean(quest.riddle)
    )
    expect(index).toBeGreaterThanOrEqual(0)
    inspectQuest({ npc: 'alex', seed: index, phase: 'offered' })
    advancePreview()
    expect(workshop.state.quest.revealed).toBe('solved')
    replayCompletion()
    expect(workshop.state.quest.status).toBe('completed')
    expect(workshop.state.quest.revealed).toBe('solved')
    expect(workshop.state.receipts[0]?.reward.bonus?.sharp).toBe(5)
  })

  it('preserves spend and clue-assisted completion instead of recreating a quest', () => {
    const index = inspectorSeeds('alex', 'en').findIndex((quest) =>
      Boolean(quest.riddle)
    )
    inspectQuest({ npc: 'alex', seed: index, phase: 'offered' })
    inspectWardrobe({
      quest: { ...workshop.state.quest, revealed: 'talk', spent: 50 },
    })
    replayCompletion()
    expect(workshop.state.quest.revealed).toBe('talk')
    expect(workshop.state.quest.spent).toBe(50)
    expect(workshop.state.quest.reward.bonus).toEqual({})
  })

  it('does not add bonuses again when a completion is replayed twice', () => {
    inspectQuest({ npc: 'hoa', seed: 0, phase: 'completed' })
    const reward = workshop.state.quest.reward
    replayCompletion()
    replayCompletion()
    expect(workshop.state.receipts[0]?.reward).toEqual(reward)
    expect(workshop.state.quest.reward).toEqual(reward)
  })

  it('uses the changed final step when advancing an arc interactively', () => {
    inspectQuest({ npc: 'hoa', seed: 0, phase: 'offered' })
    advancePreview()
    advancePreview()
    expect(workshop.state.quest.steps.at(-1)).toMatchObject({ npcId: 'vy' })
    advancePreview()
    expect(workshop.state.phase).toBe('ready')
    expect(workshop.state.quest.status).toBe('ready')
  })
})

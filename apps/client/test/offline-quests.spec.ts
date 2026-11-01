import {
  advance,
  type InteractRequest,
  type NpcId,
  QUEST_SEEDS,
} from '@saigon/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { interactWith, offline } from '@/shared/api/agent'
import { saveToken } from '@/shared/api/transport'
import { initialState } from '@/shared/state/game'
import { questFixture } from './quest-fixture'

const request = (
  npc: NpcId,
  intent: InteractRequest['intent']
): InteractRequest => ({
  message: intent === 'help' ? 'Any errands?' : "I'm back",
  intent,
  events: [],
  worldContext: {
    playerLocation: 'market',
    nearbyNpcs: [npc],
    timeOfDay: 'afternoon',
  },
})
beforeEach(() => {
  saveToken('offline-test-token')
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
})
afterEach(() => vi.unstubAllGlobals())

describe('offline NPC quests', () => {
  it('refuses to grant a shared quest reward without authoritative party state', () => {
    const quest = {
      ...questFixture(),
      scope: 'party' as const,
      status: 'ready' as const,
      progress: [true],
      party: {
        id: '11111111-1111-4111-8111-111111111111',
        memberIds: [
          '11111111-1111-4111-8111-111111111111',
          '22222222-2222-4222-8222-222222222222',
        ],
      },
    }
    const state = { ...initialState(), quests: [quest] }
    const result = offline('hoa', request('hoa', 'check'), state)
    expect(result.world.currency).toBe(30)
    expect(result.world.completedQuestIds).toEqual([])
    expect(result.quests[0]?.status).toBe('ready')
    expect(result.questEvents).toEqual([
      {
        type: 'incomplete',
        quest,
        reward: { currency: 0, itemId: null, reputation: 0 },
      },
    ])
  })
  it('does not replay already applied pending events into later repeated steps', () => {
    const quest = {
      ...questFixture(),
      steps: [
        { type: 'TALK_TO' as const, npcId: 'linh' as const },
        { type: 'TALK_TO' as const, npcId: 'linh' as const },
      ],
      progress: [true, false],
    }
    const state = { ...initialState(), quests: [quest] }
    const result = offline(
      'hoa',
      { ...request('hoa', 'chat'), events: [{ type: 'talk', npcId: 'linh' }] },
      state
    )
    expect(result.quests[0]?.progress).toEqual([true, false])
    expect(result.quests[0]?.status).toBe('active')
  })
  it.each(QUEST_SEEDS.map((spec) => spec.giverNpcId))(
    '%s offers a seed and grants its verified reward once',
    async (npc) => {
      const start = { ...initialState(), guestStatus: 'online' as const }
      const offered = await interactWith(npc, request(npc, 'help'), start)
      expect(offered.synced).toBe(false)
      expect(offered.response.questEvents[0]?.type).toBe('offered')
      const quest = offered.response.quests[0]
      if (!quest) throw new Error('No offered quest')
      let ready = quest
      for (const step of quest.steps) {
        if (step.type === 'GO_TO')
          ready = advance(ready, { type: 'visit', locationId: step.locationId })
        if (step.type === 'TALK_TO')
          ready = advance(ready, { type: 'talk', npcId: step.npcId })
        if (step.type === 'DELIVER')
          ready = advance(ready, {
            type: 'deliver',
            itemId: step.itemId,
            npcId: step.npcId,
          })
        if (step.type === 'BUY')
          ready = advance(ready, {
            type: 'purchase',
            itemId: step.marketItemId,
          })
      }
      const state = { ...start, world: offered.response.world, quests: [ready] }
      const completed = offline(npc, request(npc, 'check'), state)
      expect(completed.questEvents[0]?.type).toBe('completed')
      expect(completed.quests).toEqual([])
      expect(completed.world.currency).toBe(30 + quest.reward.currency)
      const repeated = offline(npc, request(npc, 'check'), {
        ...state,
        quests: [],
        world: completed.world,
      })
      expect(repeated.world.currency).toBe(completed.world.currency)
    }
  )
  it('keeps incomplete quests and refuses duplicate active proposals', () => {
    const start = initialState()
    const offered = offline('hoa', request('hoa', 'help'), start)
    const state = { ...start, quests: offered.quests, world: offered.world }
    const duplicate = offline('hoa', request('hoa', 'help'), state)
    expect(duplicate.quests).toHaveLength(1)
    const checked = offline('hoa', request('hoa', 'check'), state)
    expect(checked.questEvents[0]?.type).toBe('incomplete')
    expect(checked.world.currency).toBe(30)
  })
})

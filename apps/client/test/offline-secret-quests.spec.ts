import { type InteractRequest, type NpcId, SECRET_QUESTS } from '@saigon/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { interactWith } from '../src/net/agent'
import type { GameState } from '../src/state/game'
import { initialState } from '../src/state/game'

const cases = [
  ['vy', 'cityhall', 'alley', 'cityhall-lanterns', 'coffee'],
  ['son', 'postoffice', 'river', 'postoffice-river-postcard', 'photo'],
  ['thao', 'opera', 'cathedral', 'opera-cathedral-note', 'postcard'],
] as const

const request = (
  npc: NpcId,
  intent: InteractRequest['intent'],
  location: InteractRequest['worldContext']['playerLocation']
): InteractRequest => ({
  message: intent === 'help' ? 'Tell me a secret.' : 'I found it.',
  intent,
  events: [],
  worldContext: {
    playerLocation: location,
    nearbyNpcs: [npc],
    timeOfDay: 'afternoon',
  },
})

beforeEach(() => {
  vi.stubGlobal('localStorage', { getItem: () => 'offline-test-token' })
  vi.stubGlobal(
    'fetch',
    vi.fn().mockRejectedValue(new Error('offline test network'))
  )
})

afterEach(() => vi.unstubAllGlobals())

describe('offline secret quests', () => {
  it.each(
    cases
  )('%s offers and completes its secret quest', async (npc, giverLocation, destination, questId, rewardItem) => {
    const start = {
      ...initialState(),
      guestStatus: 'online' as const,
    }
    const offered = await interactWith(
      npc,
      request(npc, 'help', giverLocation),
      start
    )
    expect(offered.synced).toBe(false)
    expect(offered.response.questEvent).toMatchObject({
      type: 'offered',
      quest: SECRET_QUESTS[questId],
    })

    const quest = offered.response.quest
    if (!quest) throw new Error('secret quest was not offered')
    const ready: GameState = {
      ...start,
      quest,
      world: {
        ...start.world,
        locationId: destination,
        visitedLocations: ['market', destination],
      },
    }
    const completed = await interactWith(
      npc,
      request(npc, 'check', destination),
      ready
    )
    expect(completed.response.questEvent).toMatchObject({
      type: 'completed',
      quest: SECRET_QUESTS[questId],
    })
    expect(completed.response.quest).toBeNull()
    expect(completed.response.world.inventory[rewardItem]).toBe(1)
  })
})

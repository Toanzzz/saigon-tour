import { initialCity, type QuestStep } from '@saigon/shared'
import { afterEach, describe, expect, it } from 'vitest'
import { questPin } from '@/features/map/targets'
import { applyCity, npcPosition, resetCity } from '@/shared/api/city'
import { initialState } from '@/shared/state/game'
import { questTarget } from '@/shared/state/quests'
import { PLACES } from '@/shared/world/places'
import { questFixture } from './quest-fixture'

afterEach(resetCity)
const questWith = (step: QuestStep) => ({
  ...questFixture(),
  steps: [step],
  progress: [false],
})
describe('generic quest map targets', () => {
  it('pins visit and purchase steps to their authored destinations', () => {
    expect(
      questPin(questWith({ type: 'GO_TO', locationId: 'cathedral' }))
    ).toEqual(PLACES.cathedral.at)
    expect(
      questPin(questWith({ type: 'BUY', marketItemId: 'coffee' }))
    ).toEqual(npcPosition('mai'))
  })
  it('follows live NPC positions for conversation and delivery steps', () => {
    const city = initialCity()
    city.revision = 2
    city.npcPlacements.linh = {
      locationId: 'river',
      anchorId: 'gathering',
      position: [18, 0, 32],
    }
    applyCity(city)
    expect(questPin(questWith({ type: 'TALK_TO', npcId: 'linh' }))).toEqual([
      18, 0, 32,
    ])
    expect(
      questPin(questWith({ type: 'DELIVER', itemId: 'herbs', npcId: 'linh' }))
    ).toEqual([18, 0, 32])
  })
  it('targets the merchant after the Director moves a BUY seller', () => {
    const city = initialCity()
    city.revision = 2
    city.npcPlacements.mai = {
      locationId: 'cathedral',
      anchorId: 'gathering',
      position: [88, 0, -62],
    }
    applyCity(city)
    const quest = questWith({ type: 'BUY', marketItemId: 'coffee' })
    expect(questPin(quest)).toEqual([88, 0, -62])
    expect(
      questTarget({
        ...initialState(),
        quests: [quest],
        trackedQuestId: quest.id,
      })
    ).toBe('mai')
  })
  it('follows the giver when a quest is ready and advances to later steps', () => {
    const city = initialCity()
    city.revision = 2
    city.npcPlacements.hoa = {
      locationId: 'park',
      anchorId: 'gathering',
      position: [21, 0, -1],
    }
    applyCity(city)
    expect(
      questPin({ ...questFixture(), progress: [true], status: 'ready' })
    ).toEqual([21, 0, -1])
    const multi = {
      ...questFixture(),
      steps: [
        { type: 'GO_TO' as const, locationId: 'park' as const },
        { type: 'BUY' as const, marketItemId: 'banana' as const },
      ],
      progress: [true, false],
    }
    expect(questPin(multi)).toEqual(npcPosition('fruit-vendor'))
  })
})

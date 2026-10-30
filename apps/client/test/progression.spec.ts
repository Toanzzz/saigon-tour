import { DEMO_QUEST, objectiveSatisfied } from '@saigon/shared'
import { describe, expect, it } from 'vitest'
import { PLACES, route } from '../src/core/places'
import { grantQuest, grantReward, initialState } from '../src/state/game'

describe('the delivery journey', () => {
  it('grants the carried parcel once and keeps its verified reward idempotent', () => {
    const start = initialState()
    const accepted = grantQuest(start, DEMO_QUEST)
    expect(accepted.world.inventory.herbs).toBe(1)
    expect(grantQuest(accepted, DEMO_QUEST)).toBe(accepted)
    expect(objectiveSatisfied(DEMO_QUEST, accepted.world)).toBe(false)
    const delivered = {
      ...accepted,
      world: {
        ...accepted.world,
        inventory: { herbs: 0 },
        deliveredItems: ['herbs:linh'],
      },
    }
    expect(objectiveSatisfied(DEMO_QUEST, delivered.world)).toBe(true)
    const complete = grantReward(delivered, DEMO_QUEST)
    expect(complete.world.currency).toBe(80)
    expect(complete.world.inventory.postcard).toBe(1)
    expect(complete.completed).toHaveLength(1)
    expect(grantReward(complete, DEMO_QUEST)).toBe(complete)
    expect(grantQuest(complete, DEMO_QUEST)).toBe(complete)
  })
  it('ignores stale completion after a restart or for another quest', () => {
    const state = initialState(2)
    expect(grantReward(state, DEMO_QUEST)).toBe(state)
    const accepted = grantQuest(state, DEMO_QUEST)
    expect(grantReward(accepted, { ...DEMO_QUEST, id: 'other-quest' })).toBe(
      accepted
    )
  })
  it('keeps every route on the authored boulevard and reaches its destination', () => {
    for (const from of Object.keys(PLACES) as (keyof typeof PLACES)[]) {
      for (const to of Object.keys(PLACES) as (keyof typeof PLACES)[]) {
        if (from === to) continue
        const points = route(from, to)
        expect(points[0]).toEqual(PLACES[from].stop)
        expect(points.at(-1)).toEqual(PLACES[to].stop)
        points.slice(1).forEach((point, index) => {
          const previous = points[index]
          expect(point[0] === previous[0] || point[2] === previous[2]).toBe(
            true
          )
          expect(Math.abs(point[0])).toBeLessThan(47)
          expect(Math.abs(point[2])).toBeLessThan(38)
        })
      }
    }
  })
})

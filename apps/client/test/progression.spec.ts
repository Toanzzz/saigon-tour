import { advance, isReady } from '@saigon/shared'
import { questFixture } from './quest-fixture'

const quest = questFixture()

import { describe, expect, it } from 'vitest'
import { route } from '@/features/transport/routes'
import { grantQuest, grantReward, initialState } from '@/shared/state/game'
import { ROADS } from '@/shared/world/district'
import { PLACES } from '@/shared/world/places'

describe('the delivery journey', () => {
  it('grants the carried parcel once and keeps its verified reward idempotent', () => {
    const start = initialState()
    const accepted = grantQuest(start, quest)
    expect(accepted.world.inventory.herbs).toBe(1)
    expect(grantQuest(accepted, quest)).toBe(accepted)
    expect(isReady(accepted.quests[0])).toBe(false)
    const delivered = {
      ...accepted,
      quests: [
        advance(quest, { type: 'deliver', itemId: 'herbs', npcId: 'linh' }),
      ],
      world: {
        ...accepted.world,
        inventory: { herbs: 0 },
        deliveredItems: ['herbs:linh' as const],
      },
    }
    expect(isReady(delivered.quests[0])).toBe(true)
    const complete = grantReward(delivered, delivered.quests[0])
    expect(complete.world.currency).toBe(30 + quest.reward.currency)
    expect(complete.world.inventory.postcard).toBe(1)
    expect(complete.completed).toHaveLength(1)
    expect(grantReward(complete, quest)).toBe(complete)
    expect(grantQuest(complete, quest)).toBe(complete)
  })
  it('ignores stale completion after a restart or for another quest', () => {
    const state = initialState(2)
    expect(grantReward(state, quest)).toBe(state)
    const accepted = grantQuest(state, quest)
    expect(grantReward(accepted, { ...quest, id: 'other-quest' })).toBe(
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
          const mid: [number, number] = [
            (point[0] + previous[0]) / 2,
            (point[2] + previous[2]) / 2,
          ]
          for (const p of [point, mid]) {
            const x = p[0]
            const z = p.length === 3 ? (p as number[])[2] : p[1]
            expect(
              ROADS.some(
                (r) =>
                  Math.abs(x - r.x) <= r.w / 2 + 1 &&
                  Math.abs(z - r.z) <= r.d / 2 + 1
              ),
              `(${x}, ${z}) on ${from}->${to}`
            ).toBe(true)
          }
        })
      }
    }
  })
  it('uses an orthogonal metro express between cultural stops and bus branches elsewhere', () => {
    const metro = route('market', 'postoffice', 'metro')
    expect(metro[0]).toEqual(PLACES.market.stop)
    expect(metro.at(-1)).toEqual(PLACES.postoffice.stop)
    metro.slice(1).forEach((point, index) => {
      const previous = metro[index]
      expect(point[0] === previous[0] || point[2] === previous[2]).toBe(true)
    })
    expect(route('market', 'river', 'metro')).toEqual(route('market', 'river'))
  })
})

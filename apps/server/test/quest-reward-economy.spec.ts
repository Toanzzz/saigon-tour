import {
  createQuest,
  milestoneSeeds,
  type QuestSpec,
  rewardFor,
} from '@saigon/shared'
import { describe, expect, it } from 'vitest'

const spec: QuestSpec = {
  giverNpcId: 'hoa',
  title: 'A neighborhood favor',
  description: 'Check the park and return.',
  scope: 'solo',
  steps: [{ type: 'GO_TO', locationId: 'park' }],
}

describe('quest reward economy', () => {
  it('pays for the route home as well as the outward journey', () => {
    // Market → park → market is 95.52 units: ten distance coins.
    expect(rewardFor(spec)).toMatchObject({
      currency: 40,
      reputation: 1,
    })
  })

  it('measures consecutive route legs instead of trips from home', () => {
    const route: QuestSpec = {
      ...spec,
      steps: [
        { type: 'GO_TO', locationId: 'park' },
        { type: 'GO_TO', locationId: 'cityhall' },
        { type: 'GO_TO', locationId: 'alley' },
      ],
    }
    // Rounded closed route distance is 219.42: twenty-two distance coins.
    expect(rewardFor(route)).toMatchObject({
      currency: 72,
      reputation: 3,
    })
  })

  it('includes required purchases and riddle complexity', () => {
    expect(
      rewardFor({
        ...spec,
        steps: [{ type: 'BUY', marketItemId: 'coffee' }],
      }).currency
    ).toBe(33)
    expect(
      rewardFor({ ...spec, riddle: { text: 'A leafy place.' } }).currency
    ).toBe(45)
  })

  it('uses the longer original or twisted route without double counting', () => {
    const route: QuestSpec = {
      ...spec,
      steps: [
        { type: 'GO_TO', locationId: 'alley' },
        { type: 'GO_TO', locationId: 'cityhall' },
      ],
      twist: {
        step: { type: 'GO_TO', locationId: 'park' },
        line: 'The neighbor moved to the park.',
      },
    }
    const plain = rewardFor({ ...route, twist: undefined })
    expect(rewardFor(route).currency).toBe(plain.currency + 5)
    const quest = createQuest(route)
    if (!route.twist) throw new Error('Missing fixture twist')
    const applied = {
      ...quest,
      steps: [route.steps[0], route.twist.step],
      twist: { ...route.twist, replaced: route.steps[1] },
    }
    expect(rewardFor(applied)).toEqual(rewardFor(route))
  })

  it('makes the finale distinct from its component errands', () => {
    expect(rewardFor(milestoneSeeds('vy')[0])).toMatchObject({
      currency: 90,
      reputation: 5,
    })
    expect(rewardFor(milestoneSeeds('mai')[0]).reputation).toBe(2)
  })

  it('covers a more expensive purchase introduced by a twist', () => {
    expect(
      rewardFor({
        ...spec,
        steps: [
          { type: 'GO_TO', locationId: 'park' },
          { type: 'BUY', marketItemId: 'banana' },
        ],
        twist: {
          step: { type: 'BUY', marketItemId: 'coffee' },
          line: 'Bring coffee instead.',
        },
      }).currency
    ).toBe(58)
  })

  it('leaves room for completion bonuses at the base cap', () => {
    expect(
      rewardFor({
        ...spec,
        steps: [
          { type: 'GO_TO', locationId: 'postoffice' },
          { type: 'GO_TO', locationId: 'market' },
          { type: 'GO_TO', locationId: 'postoffice' },
        ],
        riddle: { text: 'Find the old post office.' },
      }).currency
    ).toBe(90)
  })
})

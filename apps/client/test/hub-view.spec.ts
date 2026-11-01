import { advance, createQuest } from '@saigon/shared'
import { describe, expect, it } from 'vitest'
import { grantQuest, grantReward, initialState } from '@/shared/state/game'
import { greetingFor, hubView } from '@/widgets/hub'
import { questFixture } from './quest-fixture'

const now = new Date(2026, 9, 31, 15)
describe('city hub quest view', () => {
  it('derives active title, step and reward from the tracked quest', () => {
    const quest = questFixture()
    const state = grantQuest(initialState(), quest)
    const view = hubView(state, now)
    expect(view.story.title).toBe(quest.title)
    expect(view.lede).toContain(quest.title)
    expect(view.story.coins).toBe(quest.reward.currency)
    expect(view.story.steps.some((step) => step.state === 'now')).toBe(true)
    expect(view.story.done).toBe(false)
  })
  it('suggests walking for a short next leg', () => {
    // Market -> park is under 70 units: the hub suggests walking, not a ride.
    const state = grantQuest(initialState(), questFixture())
    expect(hubView(state, now).ride).toBeNull()
  })
  it('offers the cheapest affordable ride for a long next leg', () => {
    const quest = createQuest(
      {
        giverNpcId: 'thao',
        title: 'A long walk to the square',
        description: 'Visit the cathedral square.',
        scope: 'solo',
        steps: [{ type: 'GO_TO', locationId: 'cathedral' }],
      },
      'q_test_far',
      Date.now()
    )
    const state = grantQuest(initialState(), quest)
    expect(hubView(state, now).ride).toMatchObject({
      mode: 'cyclo',
      fare: 3,
      from: 'market',
      to: 'cathedral',
    })
    expect(
      hubView({ ...state, world: { ...state.world, currency: 2 } }, now).ride
    ).toBeNull()
  })
  it('keeps an uncompleted visit current after its location was explored', () => {
    const quest = questFixture('vy')
    const state = {
      ...grantQuest(initialState(), quest),
      world: {
        ...initialState().world,
        visitedLocations: ['market' as const, 'alley' as const],
      },
    }
    const view = hubView(state, now)
    expect(view.story.title).toBe(quest.title)
    expect(view.story.done).toBe(false)
    expect(view.story.steps.some((step) => step.state === 'now')).toBe(true)
  })
  it('directs a ready errand back to its giver', () => {
    const quest = advance(questFixture(), {
      type: 'deliver',
      itemId: 'herbs',
      npcId: 'linh',
    })
    const state = {
      ...grantQuest(initialState(), quest),
      stop: 'park' as const,
    }
    // Park -> the market giver is a short, walkable leg: no ride suggested.
    expect(hubView(state, now).ride).toBeNull()
    const complete = grantReward(state, quest)
    expect(hubView(complete, now).coins).toBe(30 + quest.reward.currency)
  })
  it('shows the last neighbor and latest line', () => {
    const state = {
      ...initialState(),
      world: {
        ...initialState().world,
        talkedTo: ['hoa' as const, 'tam' as const],
      },
      lastLine: { tam: 'Bus is 5 coins!' },
    }
    expect(hubView(state, now).neighbor).toMatchObject({
      name: 'Tam',
      line: 'Bus is 5 coins!',
    })
    expect(hubView(initialState(), now).neighbor).toBeNull()
  })
  it('greets by time of day', () => {
    expect(greetingFor(new Date(2026, 0, 1, 8))).toBe('Good morning!')
    expect(greetingFor(new Date(2026, 0, 1, 20))).toBe('Good evening!')
  })
})

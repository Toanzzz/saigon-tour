import { DEMO_QUEST } from '@saigon/shared'
import { describe, expect, it } from 'vitest'
import { grantQuest, grantReward, initialState } from '../src/state/game'
import { greetingFor, hubView } from '../src/ui/hub/view'

const now = new Date(2026, 9, 31, 15)
const states = (view: ReturnType<typeof hubView>) =>
  view.story.steps.map((step) => step.state)

describe('city hub view', () => {
  it('follows the story road through the herb delivery', () => {
    const start = { ...initialState(), screen: 'playing' as const }
    expect(states(hubView(start, now))).toEqual(['now', 'next', 'next'])
    const accepted = grantQuest(start, DEMO_QUEST)
    expect(states(hubView(accepted, now))).toEqual(['done', 'now', 'next'])
    const delivered = {
      ...accepted,
      world: { ...accepted.world, deliveredItems: ['herbs:linh'] },
    }
    expect(states(hubView(delivered, now))).toEqual(['done', 'done', 'now'])
    const complete = grantReward(delivered, DEMO_QUEST)
    const view = hubView(complete, now)
    expect(states(view)).toEqual(['done', 'done', 'done'])
    expect(view.story.done).toBe(true)
    expect(view.coins).toBe(80)
  })
  it('suggests the cheapest affordable ride toward the next goal', () => {
    const accepted = grantQuest(initialState(), DEMO_QUEST)
    expect(hubView(accepted, now).ride).toMatchObject({
      mode: 'cyclo',
      fare: 3,
      from: 'market',
      to: 'park',
    })
    const broke = { ...accepted, world: { ...accepted.world, currency: 2 } }
    expect(hubView(broke, now).ride).toBeNull()
  })
  it('shows the last neighbor and their latest line', () => {
    const state = {
      ...initialState(),
      world: {
        ...initialState().world,
        talkedTo: ['hoa' as const, 'tam' as const],
      },
      lastLine: { tam: 'Bus is 5 coins!' },
    }
    expect(hubView(state, now).neighbor).toMatchObject({
      name: 'Anh Tâm',
      line: 'Bus is 5 coins!',
    })
    expect(hubView(initialState(), now).neighbor).toBeNull()
  })
  it('greets by time of day', () => {
    expect(greetingFor(new Date(2026, 0, 1, 8))).toBe('Chào buổi sáng!')
    expect(greetingFor(new Date(2026, 0, 1, 20))).toBe('Chào buổi tối!')
  })
})

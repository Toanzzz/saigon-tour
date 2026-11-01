import {
  AFFINITY_TIERS,
  affinityTier,
  NAME_PLACEHOLDER,
  refersToGreeting,
  TIER_LEVEL,
} from '@saigon/shared'
import { describe, expect, it } from 'vitest'
import { fillGreetingName } from '@/features/npc/greeting-context'

describe('greeting name placeholder', () => {
  it('fills the placeholder with the player name', () => {
    expect(fillGreetingName(`Hello, ${NAME_PLACEHOLDER}!`, 'Lan')).toBe(
      'Hello, Lan!'
    )
  })

  it('drops the placeholder cleanly when no name is available', () => {
    expect(fillGreetingName(`Hello, ${NAME_PLACEHOLDER}!`, null)).toBe('Hello!')
    expect(fillGreetingName(`Hi ${NAME_PLACEHOLDER}, welcome.`, '   ')).toBe(
      'Hi welcome.'
    )
  })

  it('leaves greetings without a placeholder untouched', () => {
    expect(fillGreetingName('Good morning.', 'Lan')).toBe('Good morning.')
  })
})

describe('affinity tiers', () => {
  it('maps the -5..+5 range onto five coarse tiers', () => {
    expect(affinityTier(-5)).toBe('hostile')
    expect(affinityTier(-1)).toBe('guarded')
    expect(affinityTier(0)).toBe('neutral')
    expect(affinityTier(2)).toBe('warm')
    expect(affinityTier(5)).toBe('close')
  })

  it('exposes a representative level for every tier', () => {
    for (const tier of AFFINITY_TIERS)
      expect(affinityTier(TIER_LEVEL[tier])).toBe(tier)
  })
})

describe('greeting reference detection', () => {
  it('detects references to the greeting or its event', () => {
    expect(refersToGreeting('what did you say when you greeted me?')).toBe(true)
    expect(refersToGreeting('tell me about the gathering')).toBe(true)
    expect(refersToGreeting('sự kiện đó là gì?')).toBe(true)
  })

  it('ignores ordinary chat', () => {
    expect(refersToGreeting('where can I buy noodles?')).toBe(false)
  })
})

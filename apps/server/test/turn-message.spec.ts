import type { InteractRequest } from '@saigon/shared'
import { describe, expect, it } from 'vitest'
import { turnMessage } from '@/features/npc/turn'

const base: InteractRequest = {
  message: '',
  intent: 'chat',
  locale: 'en',
  events: [],
  worldContext: {
    playerLocation: 'market',
    nearbyNpcs: [],
    timeOfDay: 'afternoon',
  },
}

describe('turnMessage', () => {
  it('keeps the typed player message', () => {
    expect(turnMessage({ ...base, message: 'Any errands?' })).toBe(
      'Any errands?'
    )
  })

  it('never returns an empty string for an intent with no typed text', () => {
    // The Google proxy rejects a request whose only message is the system
    // context; every turn must carry a non-system message.
    expect(turnMessage({ ...base, intent: 'milestone' })).not.toBe('')
    expect(turnMessage({ ...base, intent: 'greet' })).not.toBe('')
    expect(turnMessage(base)).not.toBe('')
  })

  it('localizes the fallback for Vietnamese', () => {
    const vi = turnMessage({ ...base, intent: 'milestone', locale: 'vi' })
    expect(vi).not.toBe('')
    expect(/[ăâđêôơư]/i.test(vi)).toBe(true)
  })
})

import { RESIDENT_IDS } from '@saigon/shared'
import { beforeEach, describe, expect, it } from 'vitest'
import { nearbyNpcs } from '@/features/conversation/nearby'
import { appendHistory, cachedHistory } from '@/shared/api/history'
import { queryClient } from '@/shared/api/query'
import { noteFriendship, pulses } from '@/shared/state/friendship'
import { game, initialState } from '@/shared/state/game'
import { npcPoses } from '@/shared/world/npc-pose'

describe('friendship feedback and local history', () => {
  beforeEach(() => {
    game.setState(() => initialState())
    pulses.setState(() => ({}))
    queryClient.removeQueries({ queryKey: ['npc-history'] })
  })
  it('caps dense nearby context at eight and excludes the speaker', () => {
    for (const id of RESIDENT_IDS) npcPoses.set(id, [-23, 0, 7])
    try {
      const ids = nearbyNpcs('hoa', [-23, 0, 7])
      expect(ids).toHaveLength(8)
      expect(ids).not.toContain('hoa')
      expect(
        ids.every((id) =>
          RESIDENT_IDS.includes(id as (typeof RESIDENT_IDS)[number])
        )
      ).toBe(true)
    } finally {
      npcPoses.clear()
    }
  })
  it('diffs effective presets, emits only changed levels, avoids duplicate pulses', () => {
    noteFriendship({}, { hoa: { level: 2 } })
    expect(pulses.state.hoa?.delta).toBe(1)
    expect(game.state.toast).toContain('Ms. Hoa')
    const at = pulses.state.hoa?.at
    noteFriendship({ hoa: { level: 2 } }, { hoa: { level: 2 } })
    expect(pulses.state.hoa?.at).toBe(at)
    expect(pulses.state.tam).toBeUndefined()
  })
  it('collapses an unanswered greeting but keeps a real reply', () => {
    appendHistory('hoa', '', 'Chào bạn!', true)
    appendHistory('hoa', '', 'Chào bạn!', true)
    appendHistory('hoa', '', 'Rainy evening, friend.', true)
    expect(cachedHistory('hoa')).toEqual([
      { role: 'assistant', content: 'Rainy evening, friend.', greeting: true },
    ])
    // A substantive reply is never overwritten by a later greeting.
    appendHistory('hoa', 'Can I help?', 'Take these herbs to Linh.')
    appendHistory('hoa', '', 'Welcome back, friend.', true)
    expect(cachedHistory('hoa')).toEqual([
      { role: 'assistant', content: 'Rainy evening, friend.', greeting: true },
      { role: 'user', content: 'Can I help?' },
      { role: 'assistant', content: 'Take these herbs to Linh.' },
      { role: 'assistant', content: 'Welcome back, friend.', greeting: true },
    ])
  })
  it('retains offline conversation in the persisted history query and clears it', () => {
    appendHistory('market-walk', 'Any errands?', 'Say hello to Linh.')
    expect(cachedHistory('market-walk')).toEqual([
      { role: 'user', content: 'Any errands?' },
      { role: 'assistant', content: 'Say hello to Linh.' },
    ])
    expect(cachedHistory('hoa')).toEqual([])
    queryClient.removeQueries({ queryKey: ['npc-history'] })
    expect(cachedHistory('market-walk')).toEqual([])
  })
})

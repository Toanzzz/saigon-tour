import { createQuest, seedsFor } from '@saigon/shared'
import { describe, expect, it } from 'vitest'
import { rewardCopy } from '@/shared/api/party'

describe('rewardCopy', () => {
  it('returns the payoff when the quest has one', () => {
    const spec = seedsFor('hoa')[0]
    if (!spec) throw new Error('missing seed')
    const quest = createQuest(
      { ...spec, payoff: 'Linh filed the broth under "excellent".' },
      'q_pay',
      0
    )
    expect(rewardCopy(quest)).toBe('Linh filed the broth under "excellent".')
  })

  it('falls back to the completed title without a payoff', () => {
    const quest = createQuest(
      {
        giverNpcId: 'hoa',
        title: 'Plain errand',
        description: 'A quest with no payoff.',
        scope: 'solo',
        steps: [{ type: 'DELIVER', itemId: 'herbs', npcId: 'linh' }],
      },
      'q_nopay',
      0
    )
    expect(rewardCopy(quest)).toContain(quest.title)
  })

  it('returns the generic line for no quest', () => {
    expect(typeof rewardCopy(null)).toBe('string')
  })
})

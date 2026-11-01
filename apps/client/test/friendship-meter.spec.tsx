import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it } from 'vitest'
import { FriendshipMeter } from '@/features/conversation/friendship-meter'
import { pulses } from '@/shared/state/friendship'
import { affinityTier } from '@/shared/ui/affinity'

const render = (level: number) =>
  renderToStaticMarkup(
    <FriendshipMeter npcId="hoa" friendship={{ hoa: { level } }} />
  )

describe('affinity header', () => {
  beforeEach(() => pulses.setState(() => ({})))
  it('maps levels to five named tiers', () => {
    expect(affinityTier(-5).tier.id).toBe('cold')
    expect(affinityTier(-2).tier.id).toBe('wary')
    expect(affinityTier(0).tier.id).toBe('neutral')
    expect(affinityTier(2).tier.id).toBe('warm')
    expect(affinityTier(5).tier.id).toBe('close')
  })
  it('renders a compact badge with the numeric meter and a popover', () => {
    const html = render(0)
    expect(html).toMatch(/<meter[^>]*value="0"/)
    expect(html).toContain('popoverTarget="affinity-info"')
    expect(html).toContain('popover="auto"')
    expect(html).toContain('Getting acquainted')
    expect(html).toContain('+2 to Warm')
  })
  it('names the current tier on the badge and shows the top message', () => {
    expect(render(5)).toContain('Friendliness: Close friend')
    expect(render(5)).toContain('As close as it gets')
  })
  it('flags a recent positive change on the badge', () => {
    pulses.setState(() => ({ hoa: { delta: 1, at: Date.now() } }))
    expect(render(2)).toContain('affinity-badge up')
  })
})

import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it } from 'vitest'
import { FriendshipMeter } from '@/features/conversation/friendship-meter'
import { pulses } from '@/shared/state/friendship'

const render = (level: number) =>
  renderToStaticMarkup(
    <FriendshipMeter npcId="hoa" friendship={{ hoa: { level } }} />
  )
const lit = (html: string, side: 'cool' | 'warm') =>
  html.match(new RegExp(`pip ${side} on`, 'g'))?.length ?? 0

describe('friendship meter', () => {
  beforeEach(() => pulses.setState(() => ({})))
  it('shows neutral as empty and centered with the next tier', () => {
    const html = render(0)
    expect(lit(html, 'cool') + lit(html, 'warm')).toBe(0)
    expect(html).toContain('Getting acquainted')
    expect(html).toContain('+2 to Warm')
    expect(html).toMatch(/<meter[^>]*value="0"/)
  })
  it('fills outward from the center by tier', () => {
    const warm = render(3)
    expect(lit(warm, 'warm')).toBe(3)
    expect(warm).toContain('tier-warm')
    const cold = render(-4)
    expect(lit(cold, 'cool')).toBe(4)
    expect(cold).toContain('Reserved')
    expect(cold).toContain('+2 to Getting acquainted')
    expect(render(5)).toContain('Best friends')
  })
  it('highlights the pip that just changed', () => {
    pulses.setState(() => ({ hoa: { delta: 1, at: Date.now() } }))
    expect(render(2).match(/changed/g)).toHaveLength(1)
  })
})

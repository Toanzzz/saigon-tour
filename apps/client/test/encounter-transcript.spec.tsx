import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MessageTime, Transcript } from '@/features/conversation/transcript'
import type { Dialogue } from '@/shared/state/game'

const dialog: Dialogue = {
  npc: 'hoa',
  requestId: 'encounter',
  earlierCount: 2,
  openedAt: '2026-11-03T07:32:00Z',
  thinking: false,
  source: null,
  activity: {
    id: 'busy',
    text: {
      en: '{name} is tending the stall.',
      vi: '{name} đang chăm nom quầy.',
    },
  },
  history: [
    {
      id: 'old-user',
      role: 'user',
      content: 'Earlier question',
      at: '2026-11-02T07:32:00Z',
    },
    {
      id: 'old-reply',
      role: 'assistant',
      content: 'Earlier answer',
      at: '2026-11-02T07:32:05Z',
    },
    {
      id: 'new-user',
      role: 'user',
      content: 'Current question',
      at: '2026-11-03T07:32:10Z',
    },
  ],
}

describe('encounter transcript', () => {
  it('renders earlier turns before the encounter divider and current turns after narration', () => {
    const html = renderToStaticMarkup(<Transcript dialog={dialog} />)
    const earlier = html.indexOf('Earlier answer')
    const divider = html.indexOf('New encounter')
    const narration = html.indexOf('Ms. Hoa is tending the stall.')
    const current = html.indexOf('Current question')
    expect(earlier).toBeGreaterThan(0)
    expect(earlier).toBeLessThan(divider)
    expect(divider).toBeLessThan(narration)
    expect(narration).toBeLessThan(current)
    expect(html).not.toContain('history-toggle')
    expect(html).toContain('chat-date')
    expect(html).toContain('dateTime="2026-11-02T07:32:05.000Z"')
  })

  it('renders unavailable timestamps without fabricating a date', () => {
    for (const at of [undefined, '', 'invalid']) {
      const html = renderToStaticMarkup(<MessageTime at={at} />)
      expect(html).toContain('Time unavailable')
      expect(html).toContain('—')
      expect(html).not.toContain('dateTime=')
    }
  })
})

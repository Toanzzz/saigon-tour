import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MicButton } from '@/features/voice'

afterEach(() => vi.unstubAllGlobals())
function render(available: boolean, supported = true) {
  vi.stubGlobal('navigator', {
    mediaDevices: supported ? { getUserMedia: () => {} } : undefined,
  })
  vi.stubGlobal('MediaRecorder', class {})
  vi.stubGlobal('AudioContext', class {})
  vi.stubGlobal('OfflineAudioContext', class {})
  const client = new QueryClient()
  client.setQueryData(['voice', 'available'], available)
  const html = renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <MicButton thinking={false} onTranscript={vi.fn()} />
    </QueryClientProvider>
  )
  client.clear()
  return html
}
describe('voice control availability', () => {
  it('hides the mic when the service is unavailable or capture unsupported', () => {
    expect(render(false)).toBe('')
    expect(render(true, false)).toBe('')
  })
  it('renders an accessible mic when capture and service are available', () => {
    expect(render(true)).toContain('aria-label="Record a voice message"')
    expect(render(true)).toContain('aria-pressed="false"')
  })
})

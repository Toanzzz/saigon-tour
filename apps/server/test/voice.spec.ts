import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, type Fetcher } from '@/app'
import { wavDuration } from '@/app/routes/voice-audio'
import { readConfig } from '@/shared'
import { live, setupNpc } from './support/npc'

const ctx = setupNpc()
const apps: ReturnType<typeof createApp>[] = []
afterEach(() => {
  for (const app of apps.splice(0)) app.realtime.manager.shutdown()
  vi.restoreAllMocks()
})
function wav(seconds = 1) {
  const bytes = new ArrayBuffer(44 + 48000 * seconds)
  const view = new DataView(bytes)
  const text = (at: number, value: string) => {
    for (let i = 0; i < value.length; i++)
      view.setUint8(at + i, value.charCodeAt(i))
  }
  text(0, 'RIFF')
  view.setUint32(4, bytes.byteLength - 8, true)
  text(8, 'WAVE')
  text(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, 24000, true)
  view.setUint32(28, 48000, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  text(36, 'data')
  view.setUint32(40, bytes.byteLength - 44, true)
  return bytes
}
function form(audio: ArrayBuffer = wav(), type = 'audio/wav', locale = 'en') {
  const body = new FormData()
  body.set('audio', new Blob([audio], { type }), 'recording.wav')
  body.set('locale', locale)
  return body
}
function app(fetcher: Fetcher = fetch, enabled = true) {
  const instance = createApp(
    {
      ...live,
      transcribeModel: enabled ? 'muse-voice-transcribe-1.0' : undefined,
    },
    fetcher,
    ctx.fx
  )
  apps.push(instance)
  return instance
}
async function send(instance: ReturnType<typeof app>, body = form()) {
  const guest = await ctx.fx.guest()
  return instance.request('/voice/transcribe', {
    method: 'POST',
    headers: { Authorization: `Bearer ${guest.token}` },
    body,
  })
}
describe('voice configuration', () => {
  it('is opt-in and independent of the chat endpoint', () => {
    const config = readConfig({ META_API_URL: 'https://other.test/chat' })
    expect(config.transcribeModel).toBeUndefined()
    expect(config.transcribeUrl).toBe('https://api.meta.ai/v1/asr/transcribe')
    expect(() =>
      readConfig({ META_TRANSCRIBE_URL: 'http://other.test/asr' })
    ).toThrow()
  })
})
describe('voice route', () => {
  it('authenticates uploads and reports both availability states', async () => {
    const enabled = app()
    expect(await (await enabled.request('/voice/status')).json()).toEqual({
      available: true,
    })
    expect(
      await (await app(fetch, false).request('/voice/status')).json()
    ).toEqual({ available: false })
    expect(
      (
        await enabled.request('/voice/transcribe', {
          method: 'POST',
          body: form(),
        })
      ).status
    ).toBe(401)
    expect((await send(app(fetch, false))).status).toBe(503)
  })
  it('sends verified multipart shape, normalizes text, and bills audio duration', async () => {
    const fetcher = vi.fn<Fetcher>(async (_input, init) => {
      const body = init?.body as FormData
      expect(body.get('audio')).toBeInstanceOf(File)
      const request = body.get('request') as File
      expect(request.type).toBe('application/json')
      expect(JSON.parse(await request.text())).toEqual({
        model: 'muse-voice-transcribe-1.0',
        audioEncoding: 'WAV',
        mode: 'PUSH_TO_TALK',
      })
      expect(new Headers(init?.headers).get('authorization')).toBe(
        'Bearer test-key'
      )
      return Response.json({
        transcript: `  Hello\u0000 ${'x'.repeat(600)} `,
        audioDurationMs: 1000,
      })
    })
    const settle = vi.spyOn(ctx.fx.db, 'settleSpend')
    const response = await send(app(fetcher))
    expect(response.status).toBe(200)
    const result = await response.json()
    expect(result.text).toHaveLength(500)
    expect(result.text).not.toMatch(/\p{Cc}/u)
    expect(settle).toHaveBeenCalledWith(expect.anything(), {
      inputTokens: 0,
      outputTokens: 0,
      estimatedUsd: 0.00005,
    })
  })
  it('enforces 1 MiB and rejects unsupported or malformed recordings before fetch', async () => {
    const fetcher = vi.fn<Fetcher>()
    const instance = app(fetcher)
    expect(
      (await send(instance, form(new ArrayBuffer(1024 * 1024 + 1)))).status
    ).toBe(413)
    expect((await send(instance, form(wav(), 'audio/webm'))).status).toBe(400)
    expect((await send(instance, form(new ArrayBuffer(44)))).status).toBe(400)
    expect((await send(instance, form(wav(16)))).status).toBe(400)
    expect((await send(instance, form(wav(), 'audio/wav', 'fr'))).status).toBe(
      400
    )
    expect(fetcher).not.toHaveBeenCalled()
    const oversizeJson = await instance.request('/me/profile', {
      method: 'POST',
      body: 'x'.repeat(20 * 1024),
    })
    expect(oversizeJson.status).toBe(413)
  })
  it('does not call the provider when the shared spend budget is exhausted', async () => {
    vi.spyOn(ctx.fx.db, 'reserveSpend').mockResolvedValue(null)
    const fetcher = vi.fn<Fetcher>()
    expect((await send(app(fetcher))).status).toBe(503)
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('enforces the per-player voice call quota', async () => {
    const instance = createApp(
      {
        ...live,
        sessionCallLimit: 0,
        transcribeModel: 'muse-voice-transcribe-1.0',
      },
      fetch,
      ctx.fx
    )
    apps.push(instance)
    expect((await send(instance)).status).toBe(429)
  })
  it.each(['provider', 'invalid', 'timeout'])(
    'degrades on %s errors and settles the reservation',
    async (kind) => {
      const fetcher: Fetcher = async (_url, init) => {
        if (kind === 'provider') return new Response('', { status: 429 })
        if (kind === 'invalid') return Response.json({ text: 'wrong response' })
        return new Promise((_resolve, reject) =>
          init?.signal?.addEventListener('abort', () =>
            reject(new Error('timeout'))
          )
        )
      }
      const settle = vi.spyOn(ctx.fx.db, 'settleSpend')
      expect((await send(app(fetcher))).status).toBe(503)
      expect(settle).toHaveBeenCalledOnce()
    }
  )
})
describe('voice audio', () => {
  it('requires PCM16 mono 24 kHz and duration at most 15 seconds', () => {
    expect(wavDuration(wav(15))).toBe(15000)
    expect(wavDuration(wav(16))).toBeNull()
    const stereo = wav()
    new DataView(stereo).setUint16(22, 2, true)
    expect(wavDuration(stereo)).toBeNull()
    expect(wavDuration(wav().slice(0, 45))).toBeNull()
  })
})

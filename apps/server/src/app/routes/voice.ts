import { LocaleSchema, TranscribeResponseSchema } from '@saigon/shared'
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { z } from 'zod'
import { CostGuard } from '@/features/npc'
import { log } from '@/shared'
import { requireAuth } from './auth'
import type { Env, RouteDeps } from './deps'
import { wavDuration } from './voice-audio'

const AudioReply = z.object({
  transcript: z.string(),
  audioDurationMs: z.number().finite().nonnegative().optional(),
})
// Meta pricing: https://dev.meta.ai/docs/pricing-rate-limits ($0.18/audio hour).
const audioCost = (durationMs: number) => (durationMs * 0.18) / 3_600_000

export function voiceRoutes({ auth, config, db, voiceFetch }: RouteDeps) {
  const guard = new CostGuard(
    config.sessionCallLimit,
    config.globalCallLimit,
    config.production,
    'voice_call_guard'
  )
  const key = config.transcribeApiKey || config.apiKey
  const available = Boolean(key && config.transcribeModel)
  return new Hono<Env>()
    .get('/status', (c) => c.json({ available }))
    .post(
      '/transcribe',
      requireAuth(auth, db),
      bodyLimit({
        maxSize: 1024 * 1024,
        onError: (c) => c.json({ error: 'request_too_large' }, 413),
      }),
      async (c) => {
        if (!available) return c.json({ error: 'voice_unavailable' }, 503)
        const form = await c.req.raw.formData().catch(() => null)
        const audio = form?.get('audio')
        const locale = LocaleSchema.safeParse(form?.get('locale') ?? 'en')
        if (
          !(audio instanceof File) ||
          !['audio/wav', 'audio/x-wav', 'audio/wave'].includes(audio.type) ||
          !locale.success
        )
          return c.json({ error: 'invalid_audio' }, 400)
        const durationMs = wavDuration(await audio.arrayBuffer())
        if (durationMs === null) return c.json({ error: 'invalid_audio' }, 400)
        if (!guard.allow(c.var.player.id))
          return c.json({ error: 'voice_unavailable' }, 429)
        // Reuse the shared conservative $0.03 reservation; settle by duration.
        const reservation = await db.reserveSpend(config.spendLimitUsd)
        if (!reservation && config.production)
          return c.json({ error: 'voice_unavailable' }, 503)
        if (!reservation) {
          const spent = await db.spendLedger().catch(() => null)
          log(
            'voice_budget_bypassed',
            `local dev: daily voice budget exhausted; used $${spent?.reservedUsd.toFixed(4) ?? 'unknown'} of $${config.spendLimitUsd.toFixed(2)} across ${spent?.calls ?? 'unknown'} calls; estimated audio $${audioCost(durationMs).toFixed(6)}; allowing instead of enforcing`,
            'warn'
          )
        }
        let chargedMs = durationMs
        try {
          const upstream = new FormData()
          upstream.set('audio', audio, 'recording.wav')
          upstream.set(
            'request',
            new Blob(
              [
                JSON.stringify({
                  model: config.transcribeModel,
                  audioEncoding: 'WAV',
                  mode: 'PUSH_TO_TALK',
                }),
              ],
              { type: 'application/json' }
            )
          )
          const response = await voiceFetch(
            config.transcribeUrl || 'https://api.meta.ai/v1/asr/transcribe',
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${key}`,
                Accept: 'application/json',
              },
              body: upstream,
              signal: AbortSignal.timeout(Math.min(config.timeoutMs, 15000)),
            }
          )
          if (!response.ok) return c.json({ error: 'voice_unavailable' }, 503)
          const reply = AudioReply.parse(await response.json())
          chargedMs = Math.min(reply.audioDurationMs ?? durationMs, 15000)
          const text = reply.transcript
            .replace(/\p{Cc}/gu, ' ')
            .trim()
            .slice(0, 500)
          return c.json(TranscribeResponseSchema.parse({ text }))
        } catch {
          return c.json({ error: 'voice_unavailable' }, 503)
        } finally {
          // On ambiguous provider failure, retain the submitted duration estimate.
          if (reservation)
            await db.settleSpend(reservation, {
              inputTokens: 0,
              outputTokens: 0,
              estimatedUsd: audioCost(chargedMs),
            })
        }
      }
    )
}

import { mkdir } from 'node:fs/promises'
import { createApp } from '../src/app'
import { readConfig } from '../src/shared'
import { fixture } from '../test/fixture'

const clip = process.argv[2]
if (!clip) throw new Error('Usage: bun apps/server/scripts/voice-live.ts <wav>')
const config = readConfig()
if (!config.apiKey && !config.transcribeApiKey)
  throw new Error('A server-side Meta credential is required')
const fx = await fixture()
const app = createApp(
  {
    ...config,
    directorMode: 'off',
    transcribeModel: config.transcribeModel || 'muse-voice-transcribe-1.0',
  },
  fetch,
  fx
)
try {
  const { token } = await fx.guest()
  const body = new FormData()
  body.set(
    'audio',
    new Blob([await Bun.file(clip).arrayBuffer()], { type: 'audio/wav' }),
    'recording.wav'
  )
  body.set('locale', 'en')
  const started = performance.now()
  const response = await app.request('/voice/transcribe', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body,
  })
  const result = {
    status: response.status,
    latencyMs: Math.round(performance.now() - started),
    response: await response.json(),
    ledger: await fx.db.spendLedger(),
    proof:
      'Actual authenticated route and Meta upstream; isolated in-memory database, no listening server',
  }
  await mkdir('/tmp/saigon-quest-evidence', { recursive: true })
  await Bun.write(
    '/tmp/saigon-quest-evidence/voice-route-live.json',
    JSON.stringify(result, null, 2)
  )
  process.stdout.write(`${JSON.stringify(result)}\n`)
  if (response.status !== 200) process.exitCode = 1
} finally {
  app.realtime.manager.shutdown()
  await fx.close()
}

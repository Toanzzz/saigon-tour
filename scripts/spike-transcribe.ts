import { mkdir } from 'node:fs/promises'

const clips = process.argv.slice(2)
if (!clips.length)
  throw new Error('Usage: bun scripts/spike-transcribe.ts <wav> ...')
const key = process.env.META_MUSE_API_KEY || process.env.META_API_KEY
if (!key) throw new Error('Set META_MUSE_API_KEY in the server environment')
const endpoint =
  process.env.META_TRANSCRIBE_URL || 'https://api.meta.ai/v1/asr/transcribe'
const parsed = new URL(endpoint)
if (
  parsed.protocol !== 'https:' &&
  !['localhost', '127.0.0.1'].includes(parsed.hostname)
)
  throw new Error('Transcription requires HTTPS outside localhost')
const model = process.env.META_TRANSCRIBE_MODEL || 'muse-voice-transcribe-1.0'
const results = []
for (const clip of clips) {
  const file = Bun.file(clip)
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (new TextDecoder().decode(bytes.slice(0, 4)) !== 'RIFF')
    throw new Error('Expected PCM WAV input')
  const form = new FormData()
  form.set(
    'request',
    new Blob(
      [
        JSON.stringify({
          model,
          audioEncoding: 'WAV',
          mode: 'PUSH_TO_TALK',
        }),
      ],
      { type: 'application/json' }
    )
  )
  form.set('audio', file, clip.split('/').at(-1))
  const started = performance.now()
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
      body: form,
      signal: AbortSignal.timeout(15000),
    })
    const body: unknown = await response.json().catch(() => null)
    results.push({
      clip,
      bytes: bytes.length,
      status: response.status,
      latencyMs: Math.round(performance.now() - started),
      body,
      billing: 'Audio-duration pricing; cost not verified by this response.',
    })
  } catch (error) {
    results.push({
      clip,
      latencyMs: Math.round(performance.now() - started),
      error: error instanceof Error ? error.name : 'request_failed',
    })
  }
}
const directory = '/tmp/saigon-quest-evidence'
await mkdir(directory, { recursive: true })
await Bun.write(
  `${directory}/transcribe-spike.json`,
  JSON.stringify(
    {
      endpoint,
      model,
      fixture: 'Synthetic macOS speech; not a microphone test',
      results,
    },
    null,
    2
  )
)
console.log(JSON.stringify(results))
if (results.some((result) => !('status' in result) || result.status !== 200))
  process.exitCode = 1

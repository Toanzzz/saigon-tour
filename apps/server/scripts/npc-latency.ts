import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { parseEnv } from 'node:util'
import { NpcHarness } from '../src/features/npc'
import { readConfig } from '../src/shared/config'
import { fixture } from '../test/fixture'

// bun apps/server/scripts/npc-latency.ts --official --samples=2
const args = new Set(process.argv.slice(2))
const env = {
  ...process.env,
  ...parseEnv(await readFile('apps/server/.env', 'utf8')),
}
if (args.has('--official')) {
  env.META_API_URL = 'https://api.meta.ai/v1'
  env.META_MODEL = 'muse-spark-1.3-contributor'
}
const config = readConfig(env)
if (!config.apiKey) throw new Error('live_model_key_required')
const samples = Number(
  process.argv.find((arg) => arg.startsWith('--samples='))?.split('=')[1] ?? 2
)
if (!Number.isInteger(samples) || samples < 1 || samples > 5)
  throw new Error('samples_must_be_1_to_5')
const fx = await fixture()
const records: object[] = []
try {
  for (let sample = 0; sample < samples; sample++) {
    for (const message of [
      'What should I eat?',
      'Can I help with an errand?',
    ]) {
      const { player } = await fx.guest()
      const harness = new NpcHarness(
        { ...config, timeoutMs: 45000 },
        fetch,
        fx.db,
        fx.storage
      )
      const started = performance.now()
      const result = await harness.interact(
        'hoa',
        {
          intent: 'chat',
          message,
          locale: 'en',
          events: [],
          worldContext: {
            playerLocation: 'market',
            nearbyNpcs: ['hoa'],
            timeOfDay: 'morning',
          },
        },
        player.id
      )
      const record = {
        sample,
        message,
        endpoint: new URL(config.apiUrl ?? '').origin,
        model: config.model,
        elapsedMs: Math.round(performance.now() - started),
        usage: harness.usage,
        source: result.source,
        toolCalls: result.toolCalls,
        reply: result.reply,
      }
      records.push(record)
      process.stdout.write(`${JSON.stringify(record)}\n`)
    }
  }
} finally {
  await mkdir('artifacts/npc-latency', { recursive: true })
  await writeFile(
    'artifacts/npc-latency/latest.json',
    JSON.stringify(records, null, 2)
  )
  await fx.close()
}

import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { PostgresStore } from '@mastra/pg'
import { NpcHarness } from '../src/features/npc'
import { clearPlayerThreads } from '../src/features/npc/memory/threads'
import { createDb, readConfig } from '../src/shared'

const config = readConfig()
assert(config.apiKey, 'live_model_key_required')
const db = await createDb(config.databaseUrl)
const storage = new PostgresStore({
  id: `memory-live-${randomUUID()}`,
  connectionString: config.databaseUrl,
  schemaName: 'mastra',
})
await storage.init()
const userId = randomUUID()
await db.orm.insert((await import('../src/shared/db/schema')).user).values({
  id: userId,
  name: 'Memory QA',
  email: `memory-${userId}@example.test`,
  emailVerified: false,
  isAnonymous: true,
})
const player = await db.ensurePlayer({ id: userId, name: 'Memory QA' })
const liveFetch: typeof fetch = async (url, init) => {
  const response = await fetch(url, init)
  if (!response.ok)
    process.stderr.write(
      `provider_http ${response.status} ${(await response.clone().text()).slice(0, 1500)}\n`
    )
  return response
}
const prompts: { input: number; output: number }[] = []
try {
  let harness = new NpcHarness(
    { ...config, sessionCallLimit: 100, globalCallLimit: 200 },
    liveFetch,
    db,
    storage
  )
  for (let index = 0; index < 25; index++) {
    if (index > 0 && index % 8 === 0) {
      await (await harness.mastra.getAgentById('hoa').getMemory())?.settled()
      harness = new NpcHarness(
        { ...config, sessionCallLimit: 100, globalCallLimit: 200 },
        liveFetch,
        db,
        storage
      )
    }
    const before = { ...harness.usage }
    const message =
      index === 1
        ? 'Please remember my favorite tea is lotus tea and my favorite snack is bánh mì.'
        : `Tell me a short neighborhood story about ${['the market', 'the park', 'the riverside', 'coffee', 'the opera'][index % 5]}. ${'I enjoy a slow walk, meeting local neighbors and learning their daily routines. '.repeat(4)}`
    const response = await harness.interact(
      'hoa',
      {
        message,
        worldContext: { playerLocation: 'market', timeOfDay: 'morning' },
      },
      player.id
    )
    assert.equal(response.source, 'live', `turn ${index + 1} must be live`)
    prompts.push({
      input: harness.usage.inputTokens - before.inputTokens,
      output: harness.usage.outputTokens - before.outputTokens,
    })
    process.stdout.write(
      `${JSON.stringify({ turn: index + 1, ...prompts.at(-1) })}\n`
    )
  }
  const agent = harness.mastra.getAgentById('hoa')
  const memory = await agent.getMemory()
  await memory?.settled()
  const store = await storage.getStore('memory')
  const observations = await store?.getObservationalMemory(
    `hoa:${player.id}`,
    player.id
  )
  assert(observations?.activeObservations, 'observations exist in Postgres')
  const recall = await harness.interact(
    'hoa',
    {
      message: 'What is my favorite tea?',
      worldContext: { playerLocation: 'market', timeOfDay: 'morning' },
    },
    player.id
  )
  assert.match(recall.reply, /lotus|sen/i, 'recalls turn 2 fact')
  assert(
    prompts.some(
      (entry, index) =>
        index > 3 &&
        entry.input > 0 &&
        entry.input < (prompts[index - 1]?.input ?? 0) * 0.85
    ),
    'prompt tokens fall after compaction'
  )
  process.stdout.write(
    `${JSON.stringify({
      passed: true,
      model: config.model,
      recall: recall.reply,
      observationCharacters: observations.activeObservations.length,
      prompts,
    })}\n`
  )
  await harness.clearMemory(player.id)
} finally {
  await clearPlayerThreads(storage, player.id)
  await db.sql.query(
    'DELETE FROM "user" WHERE id=(SELECT user_id FROM players WHERE id=$1)',
    [player.id]
  )
  await storage.close()
  await db.close()
}

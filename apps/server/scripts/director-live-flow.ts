import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import type { NpcId } from '@saigon/shared'
import { CityWorld } from '../src/domain/city'
import { CityDirector } from '../src/features/director'
import { readConfig } from '../src/shared/config'
import { fixture } from '../test/fixture'

// Run from apps/server: bun --env-file=.env scripts/director-live-flow.ts
const config = readConfig()
if (!config.apiKey) throw new Error('live_model_key_required')
const fx = await fixture()
try {
  const city = new CityWorld()
  const before = city.snapshot()
  const director = new CityDirector(
    city,
    { ...config, directorMode: 'live' },
    fx.db
  )
  await director.tick(Date.now(), 2)
  const after = city.snapshot()
  assert.equal(
    director.lastSource,
    'live',
    'director must execute real model actions'
  )
  assert(after.events.length > 0, 'live director starts an event')
  assert(after.events.length <= 2, 'event cap')
  const moved = Object.entries(after.npcPlacements).filter(
    ([npcId, placement]) =>
      JSON.stringify(placement) !==
      JSON.stringify(
        before.npcPlacements[npcId as keyof typeof before.npcPlacements]
      )
  )
  assert(moved.length > 0, 'live director moves a neighbor')
  assert(after.headlines.length > 0, 'live director posts a headline')
  assert(
    Object.keys(after.needs).length > 0,
    'live director gives a neighbor a need'
  )
  const calls = director.usage.calls
  await director.tick(Date.now() + 60_000, 2)
  assert.equal(
    director.usage.calls,
    calls,
    'the day is drafted only once; no second live draft the same day'
  )
  await director.tick(Date.now() + 100000, 0)
  assert.equal(
    director.usage.calls,
    calls,
    'empty room prevents another live draft'
  )
  const affectedNpc = Object.keys(after.needs)[0] as NpcId
  const { player } = await fx.guest()
  const harness = fx.harness(config)
  harness.game.city = () => city.snapshot()
  const reactiveQuest = await harness.interact(
    affectedNpc,
    {
      message: 'Any errands for the city event? Please propose one now.',
      intent: 'chat',
      events: [],
      worldContext: {
        playerLocation: after.npcPlacements[affectedNpc].locationId,
        timeOfDay: 'morning',
      },
    },
    player.id
  )
  assert(
    reactiveQuest.toolCalls.includes('propose-quest'),
    'NPC authors a quest with the director city context'
  )
  assert.equal(
    reactiveQuest.source,
    'live',
    'NPC proposal must come from the model'
  )
  const evidence = {
    model: config.model,
    source: director.lastSource,
    before,
    after,
    moved,
    tools: director.calls,
    usage: director.usage,
    reactiveQuest: {
      npcId: affectedNpc,
      need: after.needs[affectedNpc],
      quests: reactiveQuest.quests,
      toolCalls: reactiveQuest.toolCalls,
      source: reactiveQuest.source,
      usage: harness.usage,
    },
  }
  await mkdir('/tmp/saigon-quest-evidence', { recursive: true })
  await writeFile(
    '/tmp/saigon-quest-evidence/director-live.json',
    JSON.stringify(evidence, null, 2)
  )
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`)
  director.dispose()
} finally {
  await fx.close()
}

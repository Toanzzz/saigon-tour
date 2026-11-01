import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import type { PlayerEvent } from '@saigon/shared'
import { readConfig } from '../src/shared/config'
import { fixture } from '../test/fixture'

// Run from apps/server: bun --env-file=.env scripts/quest-live-flow.ts
const config = readConfig()
if (!config.apiKey) throw new Error('live_model_key_required')
const fx = await fixture()
try {
  const { player } = await fx.guest()
  const harness = fx.harness(config)
  const offered = await harness.interact(
    'hoa',
    {
      message:
        'Any errands? Please propose a solo errand to take herbs to Linh.',
      intent: 'chat',
      events: [],
      worldContext: { playerLocation: 'market', timeOfDay: 'morning' },
    },
    player.id
  )
  assert.equal(offered.source, 'live', 'offer must come from live model')
  assert(
    offered.toolCalls.includes('propose-quest'),
    'live model must author the quest'
  )
  const quest = offered.quests[0]
  assert(quest, 'agent offered a quest')
  const progress = []
  for (const step of quest.steps) {
    let event: PlayerEvent
    if (step.type === 'GO_TO')
      event = { type: 'visit', locationId: step.locationId }
    else if (step.type === 'TALK_TO')
      event = { type: 'talk', npcId: step.npcId }
    else if (step.type === 'BUY')
      event = { type: 'purchase', itemId: step.marketItemId }
    else event = { type: 'deliver', itemId: step.itemId, npcId: step.npcId }
    progress.push(await harness.game.applyEvents(player.id, [event]))
  }
  assert.equal(progress.at(-1)?.quests[0]?.status, 'ready')
  const completed = await harness.interact(
    'hoa',
    {
      message: "I'm back. Hello again!",
      intent: 'greet',
      events: [],
      worldContext: { playerLocation: 'market', timeOfDay: 'morning' },
    },
    player.id
  )
  assert(
    completed.questEvents.some(
      (event) => event.type === 'completed' && event.quest.id === quest.id
    )
  )
  const saved = await fx.db.player(player.id)
  assert(saved.completed.some((entry) => entry.id === quest.id))
  const beforeRepeat = saved.world.currency
  await harness.game.checkQuests(player.id, 'hoa')
  assert.equal((await fx.db.player(player.id)).world.currency, beforeRepeat)
  const evidence = {
    model: config.model,
    offered,
    progress,
    completed,
    saved,
    usage: harness.usage,
    repeatedCheckCurrency: beforeRepeat,
  }
  await mkdir('/tmp/saigon-quest-evidence', { recursive: true })
  await writeFile(
    '/tmp/saigon-quest-evidence/live-flow.json',
    JSON.stringify(evidence, null, 2)
  )
  process.stdout.write(
    `${JSON.stringify({ model: config.model, quest, offeredTools: offered.toolCalls, completionTools: completed.toolCalls, usage: harness.usage, savedCoins: saved.world.currency, completed: saved.completed.length }, null, 2)}\n`
  )
} finally {
  await fx.close()
}

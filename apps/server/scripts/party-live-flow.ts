import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import type { PlayerEvent, ServerSocketMessage } from '@saigon/shared'
import { createApp } from '../src/app'
import { readConfig } from '../src/shared/config'
import { fixture } from '../test/fixture'

// Run from apps/server: bun --env-file=.env scripts/party-live-flow.ts
const config = readConfig()
if (!config.apiKey) throw new Error('live_model_key_required')
const fx = await fixture()
const app = createApp({ ...config, directorMode: 'off' }, fetch, fx)
app.realtime.manager.stop()
try {
  const members = await Promise.all([fx.guest(), fx.guest()])
  const messages: ServerSocketMessage[][] = [[], []]
  for (const [index, member] of members.entries()) {
    app.realtime.manager.connect(member.player, {
      send: (message) => messages[index]?.push(message),
      close() {},
    })
  }
  const leader = members[0]
  const other = members[1]
  assert(leader && other)
  const invitation = await app.realtime.party.invite(
    leader.player.id,
    other.player.id
  )
  await app.realtime.party.respond(other.player.id, invitation.inviteId, true)
  const offered = await app.harness.interact(
    'hoa',
    {
      message:
        'Our party would like an original short errand. Please propose a party quest now.',
      intent: 'chat',
      events: [],
      worldContext: { playerLocation: 'market', timeOfDay: 'morning' },
    },
    leader.player.id
  )
  assert.equal(
    offered.source,
    'live',
    'party proposal must come from the live model'
  )
  assert(offered.toolCalls.includes('propose-quest'))
  const quest = offered.quests.find((entry) => entry.scope === 'party')
  assert(quest, 'party errand offered')
  for (const member of members) {
    const saved = await fx.db.player(member.player.id)
    assert(saved.quests.some((entry) => entry.id === quest.id))
    for (const step of quest.steps) {
      let event: PlayerEvent
      if (step.type === 'GO_TO')
        event = { type: 'visit', locationId: step.locationId }
      else if (step.type === 'TALK_TO')
        event = { type: 'talk', npcId: step.npcId }
      else if (step.type === 'BUY')
        event = { type: 'purchase', itemId: step.marketItemId }
      else event = { type: 'deliver', itemId: step.itemId, npcId: step.npcId }
      await app.harness.game.applyEvents(member.player.id, [event])
    }
  }
  const completed = await app.harness.interact(
    'hoa',
    {
      message:
        "I'm back. Check our party quest and give each member their earned reward.",
      intent: 'greet',
      events: [],
      worldContext: { playerLocation: 'market', timeOfDay: 'morning' },
    },
    leader.player.id
  )
  const saved = await Promise.all(
    members.map((member) => fx.db.player(member.player.id))
  )
  for (const player of saved)
    assert(player.completed.some((entry) => entry.id === quest.id))
  assert(
    messages.every((batch) =>
      batch.some(
        (message) =>
          message.type === 'quest-completed' && message.quest.id === quest.id
      )
    ),
    'both members receive a completion push'
  )
  await app.harness.game.checkQuests(leader.player.id, 'hoa')
  const repeated = await Promise.all(
    members.map((member) => fx.db.player(member.player.id))
  )
  assert.deepEqual(
    repeated.map((player) => player.world.currency),
    saved.map((player) => player.world.currency)
  )
  const evidence = {
    model: config.model,
    offered,
    completed,
    saved,
    messages,
    usage: app.harness.usage,
    repeatedCurrencies: repeated.map((player) => player.world.currency),
  }
  await mkdir('/tmp/saigon-quest-evidence', { recursive: true })
  await writeFile(
    '/tmp/saigon-quest-evidence/party-live.json',
    JSON.stringify(evidence, null, 2)
  )
  process.stdout.write(
    `${JSON.stringify({ model: config.model, quest, tools: { offered: offered.toolCalls, completed: completed.toolCalls }, currencies: saved.map((player) => player.world.currency), usage: app.harness.usage }, null, 2)}\n`
  )
} finally {
  app.realtime.manager.shutdown()
  await fx.close()
}

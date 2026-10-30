import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { writeFile } from 'node:fs/promises'

const base = process.env.API_URL || 'http://127.0.0.1:58005'
const identity = await (await fetch(`${base}/guest`, { method: 'POST' })).json()
const headers = {
  Authorization: `Bearer ${identity.token}`,
  'Content-Type': 'application/json',
}
async function turn(intent, events = []) {
  const response = await fetch(`${base}/npc/hoa/interact`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      message: intent,
      intent,
      events,
      worldContext: { playerLocation: 'market', timeOfDay: 'afternoon' },
    }),
  })
  assert.equal(response.status, 200)
}
await turn('help')
await turn('chat', [{ type: 'deliver', itemId: 'herbs', npcId: 'linh' }])
await turn('check')
execFileSync('docker', ['compose', 'restart', 'api'], { stdio: 'pipe' })
let player
for (let attempt = 0; attempt < 30; attempt++) {
  try {
    const response = await fetch(`${base}/me`, { headers })
    if (response.ok) {
      player = (await response.json()).player
      break
    }
  } catch {}
  await new Promise((resolve) => setTimeout(resolve, 500))
}
assert.equal(player?.id, identity.player.id)
assert.equal(player?.name, identity.player.name)
assert.equal(player?.world.currency, 80)
await writeFile(
  'artifacts/pass-persistence/server-restart.json',
  JSON.stringify(
    {
      id: player.id,
      name: player.name,
      currency: player.world.currency,
      completedQuestIds: player.world.completedQuestIds,
      dockerRestart: true,
    },
    null,
    2
  )
)

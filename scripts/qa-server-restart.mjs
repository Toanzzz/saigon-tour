import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'

// Capture before a user-managed restart, then verify without restarting the server here.
const base = process.env.API_URL || 'http://127.0.0.1:58001'
const token = process.env.QA_SESSION_TOKEN
assert(token, 'QA_SESSION_TOKEN must identify the saved journey')
const out = process.env.QA_OUTPUT || 'artifacts/quest-persistence'
const checkpoint = `${out}/restart-checkpoint.json`
const response = await fetch(`${base}/me`, {
  headers: { Authorization: `Bearer ${token}` },
})
assert.equal(response.status, 200)
const { player } = await response.json()
await mkdir(out, { recursive: true })
if (process.env.QA_RESTART_PHASE === 'capture') {
  assert(player.completed.length > 0, 'complete a generic quest before capture')
  await writeFile(checkpoint, JSON.stringify(player, null, 2))
} else {
  const before = JSON.parse(await readFile(checkpoint, 'utf8'))
  assert.equal(player.id, before.id)
  assert.equal(player.name, before.name)
  assert.deepEqual(player.world, before.world)
  assert.deepEqual(player.quests, before.quests)
  assert.deepEqual(player.completed, before.completed)
  assert.equal(player.reputation, before.reputation)
  await writeFile(
    `${out}/server-restart.json`,
    JSON.stringify({ player, userManagedRestart: true }, null, 2)
  )
}

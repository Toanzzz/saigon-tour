import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import {
  activate,
  chromium,
  diagnostics,
  executablePath,
  openGame,
} from './qa-quest-flow.mjs'

const require = createRequire(
  new URL('../apps/server/package.json', import.meta.url)
)
const { Client } = require('@colyseus/sdk')

const API = process.env.QA_API || 'http://127.0.0.1:58001'
const ORIGIN = 'http://127.0.0.1:58000'
const CAPACITY = 20
const out = process.env.QA_OUTPUT || 'artifacts/waiting'
await mkdir(out, { recursive: true })

/** Anonymous sign-in → bearer token, as the browser guest flow does. */
async function guestToken() {
  const response = await fetch(`${API}/auth/sign-in/anonymous`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
    body: '{}',
  })
  if (!response.ok) throw new Error(`sign-in ${response.status}`)
  return (await response.json()).token
}

async function addPeer() {
  const token = await guestToken()
  const client = new Client(API, { headers: { Origin: ORIGIN } })
  client.auth.token = token
  const room = await client.joinOrCreate('world')
  room.reconnection.enabled = false
  await new Promise((resolve) => room.onMessage('welcome', resolve))
  return room
}

/** Fill the single room to exactly CAPACITY, accounting for anyone already in. */
async function fillRoom() {
  const peers = []
  const current = (await status()).players
  const needed = Math.max(0, CAPACITY - current)
  for (let i = 0; i < needed; i++) peers.push(await addPeer())
  return peers
}

/** Add peers until the room is full again (desktop joins consume a slot). */
async function topUp(peers) {
  for (let guard = 0; guard < CAPACITY + 5; guard++) {
    const current = await status()
    if (current.full) return
    peers.push(await addPeer())
  }
}

async function status() {
  const response = await fetch(`${API}/realtime/status`, {
    headers: { Origin: ORIGIN },
  })
  return response.json()
}

const browser = await chromium.launch({ headless: true, executablePath })
const peers = await fillRoom()
const errors = []
try {
  const full = await status()
  assert.equal(full.full, true, 'room reports full')
  assert.equal(full.players, CAPACITY, 'room reports capacity players')
  assert.ok(full.longest?.name, 'status reports a longest player')
  console.log('status.full', JSON.stringify(full))

  for (const width of [1440, 390]) {
    await topUp(peers)
    const context = await browser.newContext({
      locale: 'en-US',
      viewport: { width, height: width === 390 ? 844 : 900 },
      isMobile: width === 390,
      hasTouch: width === 390,
    })
    const page = await context.newPage()
    page.on('pageerror', (error) => errors.push(`${width}: ${error.message}`))
    await openGame(page)

    // The 21st player: matchmaking refuses with room_full, UI enters waiting.
    await page.waitForFunction(
      () => window.__THREE_GAME_DIAGNOSTICS__?.network.connection === 'waiting',
      undefined,
      { timeout: 20000 }
    )
    const waiting = (await diagnostics(page)).network.waiting
    assert.ok(
      waiting?.longest?.name,
      'client waiting snapshot has a longest name'
    )

    // Notice visible on the title screen.
    const notice = page.getByRole('status').filter({ hasText: /full/i }).first()
    await notice.waitFor({ timeout: 10000 })
    await page.screenshot({ path: `${out}/waiting-title-${width}.png` })

    // Start solo play; the notice should also show in the HUD.
    await activate(page)
    await page.waitForFunction(
      () => window.__THREE_GAME_DIAGNOSTICS__?.state.screen === 'playing',
      undefined,
      { timeout: 20000 }
    )
    await notice.waitFor({ timeout: 10000 })
    await page.screenshot({ path: `${out}/waiting-hud-${width}.png` })

    // Free a slot; the browser should auto-join within ~10s.
    const freed = peers.pop()
    await freed.leave()
    await page.waitForFunction(
      () =>
        window.__THREE_GAME_DIAGNOSTICS__?.network.connection === 'connected',
      undefined,
      { timeout: 15000 }
    )
    console.log(`joined after a slot opened at ${width}px`)
    await context.close()
  }
  assert.equal(errors.length, 0, `page errors: ${errors.join(' | ')}`)
  console.log('qa-waiting: PASS')
} finally {
  for (const room of peers) await room.leave().catch(() => {})
  await browser.close()
}

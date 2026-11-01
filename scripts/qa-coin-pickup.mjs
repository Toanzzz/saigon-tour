import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(
  `${process.env.QA_MODULE_ROOT || '/private/tmp/saigon-tour-qa'}/package.json`
)
const { chromium } = require('playwright')
const executablePath =
  process.env.CHROMIUM_PATH ||
  '/Users/toan/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
const gameUrl = process.env.GAME_URL || 'http://127.0.0.1:58000/?debug=1'
const outDir = process.env.QA_OUT || '/private/tmp/saigon-tour-qa'

// First authored coin from @saigon/shared COIN_PICKUPS (coin_leloi_1 at -14,6).
const COIN = { id: 'coin_leloi_1', x: -14, z: 6, amount: 5 }

const diag = (page) => page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__)

/** Import a client module in-page and evaluate an expression against it. */
const moduleValue = (page, path, expression) =>
  page.evaluate(
    async ({ path, expression }) => {
      const loaded = performance
        .getEntriesByType('resource')
        .map((r) => r.name)
        .filter((name) => name.includes(`/src/${path}`))
        .at(-1)
      const mod = await import(loaded ?? `/src/${path}`)
      return Function('mod', expression)(mod)
    },
    { path, expression }
  )

async function onlinePlay(page) {
  await page.waitForFunction(
    () =>
      window.__THREE_GAME_DIAGNOSTICS__?.state &&
      window.__THREE_GAME_TEST_HOOKS__,
    null,
    { timeout: 30000 }
  )
  // Wait for the anonymous guest to come online (server-owned grants need it).
  await moduleValue(
    page,
    'shared/state/game.ts',
    "return new Promise((resolve) => { const t0 = Date.now(); const tick = () => { if (mod.game.state.guestStatus === 'online') return resolve(true); if (Date.now() - t0 > 15000) return resolve(false); setTimeout(tick, 100); }; tick(); })"
  ).then((online) => assert.ok(online, 'guest came online'))
  // Enter play without resetting the online session (no test-hook reset).
  await moduleValue(
    page,
    'shared/state/game.ts',
    "mod.update({ screen: 'playing', panel: 'none' }); return true"
  )
  await page.waitForFunction(
    () => window.__THREE_GAME_DIAGNOSTICS__?.state.screen === 'playing',
    null,
    { timeout: 15000 }
  )
}

/** Teleport onto the coin and assert the server grants it exactly once. */
async function pickup(page, label) {
  await onlinePlay(page)
  const before = (await diag(page)).state.currency

  await page.evaluate(
    ([x, z]) => window.__THREE_GAME_TEST_HOOKS__.teleport(x, z),
    [COIN.x, COIN.z]
  )
  const collected = await page
    .waitForFunction(
      (target) => window.__THREE_GAME_DIAGNOSTICS__?.state.currency >= target,
      before + COIN.amount,
      { timeout: 10000 }
    )
    .then(() => true)
    .catch(() => false)

  const d = await diag(page)
  const after = d.state.currency
  assert.ok(collected, `${label}: currency rose to ${before + COIN.amount}`)
  assert.equal(after, before + COIN.amount, `${label}: +${COIN.amount} coins`)
  if (d.audio.state === 'running')
    assert.ok(d.audio.events.pickup >= 1, `${label}: pickup sound fired`)

  // The coin is gone from the local renderer.
  const remaining = await moduleValue(
    page,
    'features/collectibles/pickup.ts',
    'return mod.collectedCoins.state.has(arguments[0])'.replace(
      'arguments[0]',
      `'${COIN.id}'`
    )
  )
  assert.equal(remaining, true, `${label}: coin marked collected locally`)

  // Teleporting back must not grant again (ledger once-only).
  await page.evaluate(
    ([x, z]) => window.__THREE_GAME_TEST_HOOKS__.teleport(x, z),
    [COIN.x, COIN.z]
  )
  await page.waitForTimeout(1200)
  assert.equal(
    (await diag(page)).state.currency,
    after,
    `${label}: no second grant`
  )
  await page.screenshot({ path: `${outDir}/coin-pickup-${label}.png` })
  return { before, after, audioState: d.audio.state }
}

async function run() {
  const browser = await chromium.launch({ executablePath })
  try {
    for (const [label, viewport] of [
      ['desktop', { width: 1280, height: 800 }],
      ['mobile', { width: 390, height: 844 }],
    ]) {
      const context = await browser.newContext({
        viewport,
        isMobile: label === 'mobile',
        hasTouch: label === 'mobile',
      })
      const page = await context.newPage()
      await page.goto(gameUrl, { waitUntil: 'networkidle' })
      console.log(label, JSON.stringify(await pickup(page, label)))
      await context.close()
    }
    console.log('PASS qa-coin-pickup')
  } finally {
    await browser.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})

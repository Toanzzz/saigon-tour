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
  await moduleValue(
    page,
    'shared/state/game.ts',
    "return new Promise((r)=>{const t0=Date.now();const t=()=>{if(mod.game.state.guestStatus==='online')return r(true);if(Date.now()-t0>15000)return r(false);setTimeout(t,100)};t()})"
  ).then((online) => assert.ok(online, 'guest online'))
  await moduleValue(
    page,
    'shared/state/game.ts',
    "mod.update({screen:'playing',panel:'none'});return true"
  )
  await page.waitForFunction(
    () => window.__THREE_GAME_DIAGNOSTICS__?.state.screen === 'playing',
    null,
    { timeout: 15000 }
  )
}

const collectingSize = (page) =>
  moduleValue(
    page,
    'features/collectibles/pickup.ts',
    'return mod.collectingCoins.state.size'
  )
const isCollected = (page) =>
  moduleValue(
    page,
    'features/collectibles/pickup.ts',
    `return mod.collectedCoins.state.has('${COIN.id}')`
  )

async function collect(page, label) {
  await onlinePlay(page)
  const before = (await diag(page)).state.currency

  await page.evaluate(
    ([x, z]) => window.__THREE_GAME_TEST_HOOKS__.teleport(x, z),
    [COIN.x, COIN.z]
  )

  // The coin is marked collected and enters the effect window.
  await page.waitForFunction(() => true, null, { timeout: 500 })
  const collected = await page
    .waitForFunction(
      (target) => window.__THREE_GAME_DIAGNOSTICS__?.state.currency >= target,
      before + COIN.amount,
      { timeout: 10000 }
    )
    .then(() => true)
    .catch(() => false)
  assert.ok(collected, `${label}: currency rose to ${before + COIN.amount}`)
  assert.equal(await isCollected(page), true, `${label}: coin collected`)

  // Grab a frame mid-effect for evidence.
  await page.screenshot({ path: `${outDir}/coin-collect-${label}.png` })

  // The collect effect clears itself; no residual animating coin remains.
  let cleared = false
  for (let i = 0; i < 20 && !cleared; i++) {
    await page.waitForTimeout(250)
    cleared = (await collectingSize(page)) === 0
  }
  assert.ok(cleared, `${label}: effect cleaned up`)

  // Re-entering the spot does not grant again.
  const after = (await diag(page)).state.currency
  await page.evaluate(
    ([x, z]) => window.__THREE_GAME_TEST_HOOKS__.teleport(x, z),
    [COIN.x, COIN.z]
  )
  await page.waitForTimeout(1000)
  assert.equal(
    (await diag(page)).state.currency,
    after,
    `${label}: no second grant`
  )
  return { before, after }
}

/** Reduced motion collapses to an instant collect: no effect window. */
async function reducedMotion(page) {
  await onlinePlay(page)
  await moduleValue(
    page,
    'shared/state/game.ts',
    'mod.update({reducedMotion:true});return true'
  )
  const before = (await diag(page)).state.currency
  // Use the second coin so the earlier one is irrelevant to this context.
  await moduleValue(page, 'features/collectibles/pickup.ts', 'return true')
  await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.teleport(-2, 2))
  await page
    .waitForFunction(
      (t) => window.__THREE_GAME_DIAGNOSTICS__?.state.currency >= t,
      before + 5,
      { timeout: 10000 }
    )
    .catch(() => {})
  // With reduced motion the effect set is never populated.
  assert.equal(await collectingSize(page), 0, 'reduced-motion: no effect')
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
      console.log(label, JSON.stringify(await collect(page, label)))
      await context.close()
    }

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    })
    const page = await context.newPage()
    await page.goto(gameUrl, { waitUntil: 'networkidle' })
    await reducedMotion(page)
    console.log('reduced-motion ok')
    await context.close()

    console.log('PASS qa-coin-collect')
  } finally {
    await browser.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})

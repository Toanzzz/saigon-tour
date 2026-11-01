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

/** Count live 3D coin emblem canvases (each `.coin-emblem` wraps one canvas). */
const emblemCanvases = (page, scope = '') =>
  page.locator(`${scope} .coin-emblem canvas`).count()

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

async function check(page, label) {
  await onlinePlay(page)

  // 1. HUD header wallet emblem (always-on during play).
  await page.locator('.game-header .wallet .coin-emblem canvas').waitFor({
    state: 'attached',
    timeout: 15000,
  })
  assert.ok(
    (await emblemCanvases(page, '.game-header')) >= 1,
    `${label}: header coin emblem`
  )
  await page.screenshot({ path: `${outDir}/coin-emblem-${label}-header.png` })

  // 2. Journal wallet emblem.
  await moduleValue(
    page,
    'shared/state/game.ts',
    "mod.update({panel:'journal'});return true"
  )
  await page.locator('.journal-section .coin-emblem canvas').waitFor({
    state: 'attached',
    timeout: 15000,
  })
  await page.screenshot({ path: `${outDir}/coin-emblem-${label}-journal.png` })
  await moduleValue(
    page,
    'shared/state/game.ts',
    "mod.update({panel:'none'});return true"
  )

  // 3. Hub wallet + story card emblems.
  await moduleValue(
    page,
    'shared/state/game.ts',
    "mod.update({screen:'hub'});return true"
  )
  await page.locator('.hub-topbar .wallet .coin-emblem canvas').waitFor({
    state: 'attached',
    timeout: 15000,
  })
  const hubEmblems = await emblemCanvases(page, '.hub-inner')
  assert.ok(hubEmblems >= 1, `${label}: hub coin emblem(s): ${hubEmblems}`)
  await page.screenshot({ path: `${outDir}/coin-emblem-${label}-hub.png` })
  await moduleValue(
    page,
    'shared/state/game.ts',
    "mod.update({screen:'playing'});return true"
  )

  // 4. Reward popup emblem.
  await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.setState('reward'))
  await page.locator('.reward-coin-row .coin-emblem canvas').waitFor({
    state: 'attached',
    timeout: 15000,
  })
  await page.screenshot({ path: `${outDir}/coin-emblem-${label}-reward.png` })

  const d = await diag(page)
  return { label, fps: Math.round(d.fps), drawCalls: d.renderer.render.calls }
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
      console.log(label, JSON.stringify(await check(page, label)))
      await context.close()
    }
    console.log('PASS qa-coin-emblem')
  } finally {
    await browser.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})

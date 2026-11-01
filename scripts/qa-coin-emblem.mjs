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

/** Open the reward popup via the test hook and confirm the 3D coin paints. */
async function checkReward(page, label) {
  await page.waitForFunction(() => window.__THREE_GAME_TEST_HOOKS__, null, {
    timeout: 30000,
  })
  await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.setState('reward'))

  const stage = page.locator('.reward-coin-stage')
  await stage.waitFor({ state: 'visible', timeout: 15000 })
  const canvas = page.locator('.reward-coin-stage canvas')
  await canvas.waitFor({ state: 'attached', timeout: 15000 })

  // Reward amount text is still present next to the 3D coin.
  const amount = await page.locator('.reward-coin-row').innerText()
  assert.ok(/\+/.test(amount), `${label}: reward amount visible (${amount})`)

  // The 2D SSR glyph is replaced by the client 3D stage.
  const stageCount = await page
    .locator('.reward-coin-row .reward-coin-stage')
    .count()
  assert.equal(stageCount, 1, `${label}: one 3D coin stage in the coin row`)

  // The WebGL canvas loaded with real backing-store dimensions.
  const gl = await page.evaluate(() => {
    const c = document.querySelector('.reward-coin-stage canvas')
    if (!(c instanceof HTMLCanvasElement)) return null
    const ctx = c.getContext('webgl2') || c.getContext('webgl')
    const r = c.getBoundingClientRect()
    return {
      has: !!ctx,
      w: c.width,
      h: c.height,
      rectW: r.width,
      rectH: r.height,
    }
  })
  assert.ok(gl?.has, `${label}: WebGL context present`)
  assert.ok(gl.w > 0 && gl.h > 0, `${label}: canvas backing store sized`)
  assert.ok(gl.rectW >= 40 && gl.rectH >= 40, `${label}: coin box laid out`)

  // The coin GLB is served.
  const coin = await page.evaluate(async () => {
    const base = document.querySelector('base')?.href || `${location.origin}/`
    const r = await fetch(`${base}models/collectibles/coin.glb`)
    return r.status
  })
  assert.equal(coin, 200, `${label}: coin.glb served`)

  await page.waitForTimeout(800)
  await page
    .locator('.reward-dialog')
    .screenshot({ path: `${outDir}/coin-emblem-${label}.png` })
  return { amount, gl }
}

async function run() {
  const browser = await chromium.launch({ executablePath })
  try {
    const desktop = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    })
    const dpage = await desktop.newPage()
    await dpage.goto(gameUrl, { waitUntil: 'networkidle' })
    await dpage.waitForFunction(
      () => window.__THREE_GAME_DIAGNOSTICS__?.state,
      null,
      { timeout: 30000 }
    )
    console.log('desktop', JSON.stringify(await checkReward(dpage, 'desktop')))

    const mobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    })
    const mpage = await mobile.newPage()
    await mpage.goto(gameUrl, { waitUntil: 'networkidle' })
    await mpage.waitForFunction(
      () => window.__THREE_GAME_DIAGNOSTICS__?.state,
      null,
      { timeout: 30000 }
    )
    console.log('mobile', JSON.stringify(await checkReward(mpage, 'mobile')))

    console.log('PASS qa-coin-emblem')
  } finally {
    await browser.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})

import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { movePlayer } from './qa-city-controls.mjs'
import { buyGood } from './qa-quest-flow.mjs'

const require = createRequire(
  `${process.env.QA_MODULE_ROOT || '/private/tmp/saigon-tour-qa'}/package.json`
)
const { chromium } = require('playwright')
const out = path.resolve(
  process.env.QA_OUTPUT || 'artifacts/city-expansion-complete'
)
await mkdir(out, { recursive: true })
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROMIUM_PATH ||
    '/Users/toan/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  args: ['--enable-webgl'],
})
const reports = []

async function verify(viewport) {
  const mobile = viewport.width === 390
  const label = mobile ? 'mobile' : 'desktop'
  const context = await browser.newContext({
    locale: 'en-US',
    viewport,
    isMobile: mobile,
    hasTouch: mobile,
    deviceScaleFactor: 1,
    recordVideo:
      process.env.QA_RECORD_VIDEO === '0'
        ? undefined
        : { dir: `${out}/video`, size: viewport },
  })
  const page = await context.newPage()
  const errors = []
  const requests = []
  const captures = {}
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('requestfailed', (request) =>
    requests.push({ url: request.url(), error: request.failure()?.errorText })
  )
  const diag = () => page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__)
  const capture = async (name) => {
    await page.waitForTimeout(650)
    captures[name] = await diag()
    await page.screenshot({ path: `${out}/${label}-${name}.png` })
  }
  const teleport = async (x, z) => {
    await page.evaluate(
      ([a, b]) => window.__THREE_GAME_TEST_HOOKS__.teleport(a, b),
      [x, z]
    )
    await page.waitForFunction(
      ([a, b]) => {
        const p = window.__THREE_GAME_DIAGNOSTICS__?.state?.position
        return p && Math.hypot(p[0] - a, p[2] - b) < 0.6
      },
      [x, z],
      { timeout: 5000 }
    )
    await page.waitForTimeout(800)
  }
  try {
    await page.goto(process.env.GAME_URL || 'http://127.0.0.1:58000/?debug=1')
    const start = page.getByRole('button', {
      name: 'Start exploring',
      exact: true,
    })
    await start.click({ timeout: 60000 })
    let startRetries = 0
    try {
      await page.waitForFunction(
        () => window.__THREE_GAME_DIAGNOSTICS__?.state?.screen === 'playing',
        { timeout: 10000 }
      )
    } catch (error) {
      if (!(await start.isVisible())) throw error
      startRetries += 1
      await start.click()
      await page.waitForFunction(
        () => window.__THREE_GAME_DIAGNOSTICS__?.state?.screen === 'playing',
        { timeout: 10000 }
      )
    }
    await page.waitForFunction(
      () =>
        window.__THREE_GAME_DIAGNOSTICS__?.renderer?.render?.triangles > 1000
    )
    await page.waitForTimeout(1500)
    assert.equal(
      await page.locator('body').evaluate((node) => node.scrollWidth),
      viewport.width,
      'UI fits the viewport'
    )
    await movePlayer(page, context, diag, mobile)
    await capture('active-day')

    await page.getByRole('button', { name: 'Pause game' }).click()
    const evening = page.getByLabel('Evening city lights')
    await evening.check()
    assert(await evening.isChecked(), 'evening city lights toggle is on')
    await capture('evening')
    await page
      .getByRole('button', { name: 'Continue exploring', exact: true })
      .click()

    const walletBefore = (await diag()).state.currency
    await buyGood(page, 'coffee')
    await page.waitForFunction(
      (expected) =>
        window.__THREE_GAME_DIAGNOSTICS__?.state?.currency === expected,
      walletBefore - 3
    )
    assert.equal((await diag()).state.currency, walletBefore - 3)
    assert(
      (await page.locator('.npc-shop').innerText()).includes('1 in bag'),
      'coffee appears in the saved bag'
    )
    await capture('market-purchase')
    await page.getByRole('button', { name: 'Close panel', exact: true }).click()

    await teleport(-10, 12)
    if (mobile) await page.locator('button.touch-interact').click()
    else await page.keyboard.press('e')
    await page.getByLabel('Destination').selectOption('opera')
    await page.getByRole('button', { name: /Metro 6 coins/ }).click()
    const metroWallet = (await diag()).state.currency
    await page.getByRole('button', { name: /Board Metro/ }).click()
    await page.waitForFunction(
      () => window.__THREE_GAME_DIAGNOSTICS__?.state?.ride?.mode === 'metro'
    )
    await capture('metro-riding')
    await page.waitForFunction(
      () => window.__THREE_GAME_DIAGNOSTICS__?.state?.ride === null,
      null,
      { timeout: 20000 }
    )
    const metroArrival = await diag()
    assert.equal(metroArrival.state.currency, metroWallet - 6)
    assert(
      Math.hypot(
        metroArrival.state.position[0] - 89.8,
        metroArrival.state.position[2] + 35
      ) < 2,
      'metro reaches the Opera House stop'
    )

    await teleport(23, 29)
    await page
      .getByRole('button', {
        name: 'See the river postcard view',
      })
      .click()
    await page.getByRole('heading', { name: 'A river postcard' }).waitFor()
    await page.waitForFunction(
      () => window.__THREE_GAME_DIAGNOSTICS__?.state?.viewpoint === 'river'
    )
    await page.waitForTimeout(120)
    assert.equal(
      (await diag()).state.viewpoint,
      'river',
      'postcard opens the river viewpoint'
    )
    await capture('river-postcard')
    await page
      .getByRole('button', {
        name: 'Return to the riverside',
      })
      .click()
    await page.waitForFunction(
      () => window.__THREE_GAME_DIAGNOSTICS__?.state?.viewpoint === null
    )
    assert.deepEqual(errors, [], 'no page or console errors')
    assert.deepEqual(requests, [], 'no failed requests')
    const report = {
      viewport,
      startRetries,
      captures,
      metroArrival: metroArrival.state.position,
      errors,
      requests,
    }
    reports.push(report)
    await writeFile(
      `${out}/${label}.json`,
      `${JSON.stringify(report, null, 2)}\n`
    )
    console.log(
      `${label}: evening, coffee purchase, metro, river postcard passed; ` +
        `${captures['active-day'].renderer.render.calls} calls / ` +
        `${captures['active-day'].renderer.render.triangles} triangles`
    )
  } catch (error) {
    await page
      .screenshot({ path: `${out}/${label}-failure.png` })
      .catch(() => {})
    await writeFile(
      `${out}/${label}-failure.json`,
      JSON.stringify(
        {
          error: String(error),
          diagnostics: await diag(),
          text: await page.locator('body').innerText(),
          errors,
          requests,
        },
        null,
        2
      )
    )
    throw error
  } finally {
    await context.close()
  }
}
try {
  await verify({ width: 1440, height: 900 })
  await verify({ width: 390, height: 844 })
  await writeFile(`${out}/report.json`, `${JSON.stringify(reports, null, 2)}\n`)
} finally {
  await browser.close()
}

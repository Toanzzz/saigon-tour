import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'

const require = createRequire('/private/tmp/saigon-tour-qa/package.json')
const { chromium } = require('playwright')
const browser = await chromium.launch({
  headless: true,
  executablePath:
    '/Users/toan/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
})
const results = []
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
    })
    const page = await context.newPage()
    await page.bringToFront()
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto(process.env.GAME_URL || 'http://127.0.0.1:58003/?debug=1')
    await page.waitForFunction(() =>
      localStorage.getItem('saigon-tour.session-token')
    )
    const token = await page.evaluate(() =>
      localStorage.getItem('saigon-tour.session-token')
    )
    const base = process.env.API_URL || 'http://127.0.0.1:58004'
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
    const before = (await (await fetch(`${base}/me`, { headers })).json())
      .player
    const post = (intent, events = []) =>
      fetch(`${base}/npc/hoa/interact`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          intent,
          message: intent,
          events,
          worldContext: { playerLocation: 'market', timeOfDay: 'morning' },
        }),
      })
    await post('help')
    await post('chat', [{ type: 'deliver', itemId: 'herbs', npcId: 'linh' }])
    await post('check')
    await page.reload()
    await page.getByText(`Welcome back, ${before.name}`).waitFor()
    await page.waitForFunction(
      () => window.__THREE_GAME_DIAGNOSTICS__?.state.frame > 30
    )
    await page
      .getByRole('button', { name: 'Start exploring', exact: true })
      .click()
    await page
      .getByRole('button', { name: 'Pause game', exact: true })
      .waitFor()
    await page.waitForFunction(
      () => window.__THREE_GAME_DIAGNOSTICS__?.state.currency === 80
    )
    await page.getByRole('button', { name: 'Pause game', exact: true }).click()
    await page
      .getByRole('button', { name: 'Start a new journey', exact: true })
      .click()
    await page.waitForFunction(
      () => window.__THREE_GAME_DIAGNOSTICS__?.state.currency === 30
    )
    const after = (await (await fetch(`${base}/me`, { headers })).json()).player
    assert.equal(after.name, before.name)
    assert.equal(after.world.currency, 30)
    assert.equal(
      await page.evaluate(() => document.body.scrollWidth > innerWidth),
      false
    )
    assert.deepEqual(errors, [])
    results.push({
      width,
      guestName: after.name,
      reloadCurrency: 80,
      resetCurrency: 30,
      errors,
    })
    await context.close()
  }
  await mkdir('artifacts/pass-persistence', { recursive: true })
  await writeFile(
    'artifacts/pass-persistence/session-flow.json',
    JSON.stringify(results, null, 2)
  )
} finally {
  await browser.close()
}

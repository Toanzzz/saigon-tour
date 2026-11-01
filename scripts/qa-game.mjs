import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import {
  chromium,
  completeQuest,
  diagnostics,
  executablePath,
  openGame,
} from './qa-quest-flow.mjs'

const browser = await chromium.launch({ headless: true, executablePath })
const results = []
const out = process.env.QA_OUTPUT || 'artifacts/quest-overhaul'
await mkdir(out, { recursive: true })
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({
      locale: 'en-US',
      viewport: { width, height: width === 390 ? 844 : 900 },
      isMobile: width === 390,
      hasTouch: width === 390,
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    if (process.env.QA_OFFLINE === '1') {
      await context.route('**/npc/*/interact', (route) =>
        route.fulfill({ status: 503, body: '{}' })
      )
      await context.route('**/matchmake/**', (route) =>
        route.fulfill({ status: 503, body: '{}' })
      )
    }
    await openGame(page)
    let result
    try {
      result = await completeQuest(page)
    } catch (error) {
      await writeFile(
        `${out}/failure-${width}.json`,
        JSON.stringify(
          {
            diagnostics: await diagnostics(page),
            text: await page.locator('body').innerText(),
            error: String(error),
          },
          null,
          2
        )
      )
      await page.screenshot({ path: `${out}/failure-${width}.png` })
      throw error
    }
    await page.screenshot({ path: `${out}/quest-reward-${width}.png` })
    assert.equal(
      await page.evaluate(() => document.body.scrollWidth > innerWidth),
      false
    )
    assert.deepEqual(errors, [])
    results.push({
      width,
      offline: process.env.QA_OFFLINE === '1',
      ...result,
      current: await diagnostics(page),
      errors,
    })
    await context.close()
  }
  await writeFile(`${out}/quest-flow.json`, JSON.stringify(results, null, 2))
} finally {
  await browser.close()
}

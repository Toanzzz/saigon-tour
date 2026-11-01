import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import {
  chromium,
  diagnostics,
  dismiss,
  executablePath,
  offerQuest,
  openGame,
} from './qa-quest-flow.mjs'

const browser = await chromium.launch({ headless: true, executablePath })
const out = process.env.QA_OUTPUT || 'artifacts/quest-journal'
const results = []
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
    page.on('pageerror', (error) => errors.push(error.stack ?? error.message))
    if (process.env.QA_OFFLINE === '1') {
      await context.route('**/npc/*/interact', (route) =>
        route.fulfill({ status: 503, body: '{}' })
      )
      await context.route('**/matchmake/**', (route) =>
        route.fulfill({ status: 503, body: '{}' })
      )
    }
    await openGame(page)
    const offered = await offerQuest(page)
    await dismiss(page)
    const pins = page
      .locator('svg title')
      .filter({ hasText: `Errand target: ${offered.title}` })
    assert((await pins.count()) > 0, 'minimap shows the current quest target')
    if (width === 390) {
      await page
        .getByRole('button', { name: 'Open city hub', exact: true })
        .click()
      await page
        .getByRole('button', { name: 'Open journal', exact: true })
        .click()
    } else
      await page
        .getByRole('button', { name: 'Open journal', exact: true })
        .click()
    const questSection = page.getByRole('region', {
      name: offered.title,
      exact: true,
    })
    await questSection
      .getByRole('button', { name: 'Track errand', exact: true })
      .click()
    assert.equal((await diagnostics(page)).state.trackedQuestId, offered.id)
    await page.screenshot({ path: `${out}/tracked-${width}.png` })
    await questSection
      .getByRole('button', { name: 'Abandon errand', exact: true })
      .click()
    await page.waitForFunction(
      (id) =>
        !window.__THREE_GAME_DIAGNOSTICS__?.state.quests.some(
          (quest) => quest.id === id
        ),
      offered.id
    )
    await page.getByText('The errand was removed from your journal.').waitFor()
    await dismiss(page)
    assert.equal(
      await page
        .locator('svg title')
        .filter({ hasText: `Errand target: ${offered.title}` })
        .count(),
      0
    )
    const after = await diagnostics(page)
    assert.equal(after.state.completed, 0)
    assert.equal(
      await page.evaluate(() => document.body.scrollWidth > innerWidth),
      false
    )
    results.push({ width, offered, after, errors })
    await writeFile(`${out}/flow.json`, JSON.stringify(results, null, 2))
    assert.deepEqual(errors, [])
    await context.close()
  }
  await writeFile(`${out}/flow.json`, JSON.stringify(results, null, 2))
} finally {
  await browser.close()
}

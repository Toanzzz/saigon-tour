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
const out = process.env.QA_OUTPUT || 'artifacts/quest-persistence'
await mkdir(out, { recursive: true })
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: width === 390 ? 844 : 900 },
      isMobile: width === 390,
      hasTouch: width === 390,
    })
    const page = await context.newPage()
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
      throw error
    }
    const { rewarded } = result
    const guestName = rewarded.network.guestName
    await page.reload()
    await page.getByText(`Welcome back, ${guestName}`).waitFor()
    await page
      .getByRole('button', { name: 'Start exploring', exact: true })
      .click()
    await page.waitForFunction(
      (coins) => window.__THREE_GAME_DIAGNOSTICS__?.state.currency === coins,
      rewarded.state.currency
    )
    assert.equal(
      (await diagnostics(page)).state.completed,
      rewarded.state.completed
    )
    await page.getByRole('button', { name: 'Pause game', exact: true }).click()
    await page
      .getByRole('button', { name: 'Start a new journey', exact: true })
      .click()
    await page.waitForFunction(
      () => window.__THREE_GAME_DIAGNOSTICS__?.state.currency === 30
    )
    const reset = await diagnostics(page)
    assert.equal(reset.network.guestName, guestName)
    assert.equal(reset.state.completed, 0)
    assert.deepEqual(reset.state.quests, [])
    results.push({ width, rewarded, reset })
    await context.close()
  }
  await writeFile(`${out}/flow.json`, JSON.stringify(results, null, 2))
} finally {
  await browser.close()
}

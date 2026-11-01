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
const out = process.env.QA_OUTPUT || 'artifacts/unlocks'
await mkdir(out, { recursive: true })
const results = []

try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({
      locale: 'en-US',
      viewport: { width, height: 900 },
      isMobile: width === 390,
      hasTouch: width === 390,
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (error) => {
      errors.push(error.message)
      console.log('PAGEERROR', error.message)
    })
    await openGame(page)

    // Complete hoa's seed errand; the neutral-tier reward is an unlock.
    const { offered } = await completeQuest(page, 'hoa')
    const unlockId = offered.reward.unlockId
    assert(
      unlockId,
      'seed quest reward should include an unlock at neutral tier'
    )

    // The reward popup opens and names the unlock.
    await page.waitForFunction(
      () => window.__THREE_GAME_DIAGNOSTICS__?.state.panel === 'reward',
      null,
      { timeout: 10000 }
    )
    const rewardText = await page.locator('.reward-dialog').innerText()
    assert(/unlocked/i.test(rewardText), 'reward popup should show the unlock')
    await page.screenshot({ path: `${out}/reward-${width}.png` })

    // The unlock is owned.
    let state = (await diagnostics(page)).state
    assert(
      state.unlocks.owned.includes(unlockId),
      'completed quest should grant the unlock'
    )

    // Close the popup, open the wardrobe, equip the unlock.
    await page.getByRole('button', { name: 'Continue exploring' }).click()
    await page.waitForFunction(
      () => window.__THREE_GAME_DIAGNOSTICS__?.state.panel === 'none'
    )
    // A completed errand can surface the city hub; close it first.
    const closeHub = page.getByRole('button', { name: 'Close city hub' })
    if (await closeHub.isVisible().catch(() => false)) {
      await closeHub.click()
      await page.waitForFunction(
        () => window.__THREE_GAME_DIAGNOSTICS__?.state.screen === 'playing'
      )
    }
    await page.getByRole('button', { name: 'Open wardrobe' }).first().click()
    await page.waitForFunction(
      () => window.__THREE_GAME_DIAGNOSTICS__?.state.panel === 'wardrobe'
    )
    await page.screenshot({ path: `${out}/wardrobe-${width}.png` })
    const chip = page.locator('.wardrobe-chip', { hasText: /\S/ }).filter({
      hasNotText: 'None',
    })
    // Click the first owned (non-locked) chip.
    const equippable = page
      .locator('.wardrobe-chip:not(.is-locked)')
      .filter({ hasNotText: 'None' })
      .first()
    await equippable.click()
    await page.waitForFunction(
      (id) =>
        Object.values(
          window.__THREE_GAME_DIAGNOSTICS__?.state.unlocks.equipped ?? {}
        ).includes(id),
      unlockId,
      { timeout: 10000 }
    )
    state = (await diagnostics(page)).state
    assert(
      Object.values(state.unlocks.equipped).includes(unlockId),
      'equip should persist to state'
    )
    void chip

    results.push({ width, unlockId, equipped: state.unlocks.equipped, errors })
    assert.equal(errors.length, 0, `no page errors at ${width}px`)
    await context.close()
  }
  await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2))
  console.log('UNLOCKS_QA_OK', JSON.stringify(results))
} finally {
  await browser.close()
}

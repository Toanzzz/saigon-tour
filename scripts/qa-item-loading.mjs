import assert from 'node:assert/strict'
import { chromium, executablePath } from './qa-quest-flow.mjs'

const browser = await chromium.launch({ headless: true, executablePath })
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({
      viewport: { width, height: 900 },
      locale: 'en-US',
      isMobile: width === 390,
      hasTouch: width === 390,
    })
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto('http://127.0.0.1:58000/?wardrobeDebug')
    await page.locator('.wardrobe-stage-view canvas').waitFor()
    await page.waitForTimeout(2500)
    await page.waitForFunction(() => !document.querySelector('.loading-panel'))
    let release
    const pending = new Promise((resolve) => {
      release = resolve
    })
    await page.route('**/models/cosmetics/non-la.glb', async (route) => {
      await pending
      await route.continue()
    })
    const card = page.locator('.wardrobe-card').filter({
      has: page.getByText('nón lá hat', { exact: true }),
    })
    await card.getByRole('button', { name: 'Equip', exact: true }).click()
    const stage = page.locator('.wardrobe-stage-view')
    await stage.scrollIntoViewIfNeeded()
    const panel = stage.getByRole('status')
    await panel.waitFor()
    assert.equal(await panel.innerText(), 'Getting your look ready…')
    const stageBox = await stage.boundingBox()
    const panelBox = await panel.boundingBox()
    assert(panelBox.width >= stageBox.width - 4, 'covers preview width')
    assert(panelBox.height >= stageBox.height - 4, 'covers preview height')
    assert.equal(
      await panel.evaluate((el) => getComputedStyle(el).backgroundColor),
      await stage.evaluate((el) => getComputedStyle(el).backgroundColor)
    )
    await page.screenshot({ path: `/tmp/item-loading-${width}.png` })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    assert.equal(
      await page
        .locator('.loading-panel-lantern')
        .evaluate((el) => getComputedStyle(el).animationName),
      'none'
    )
    release()
    await panel.waitFor({ state: 'hidden', timeout: 30000 })
    await card.getByRole('button', { name: 'Unequip', exact: true }).click()
    await card.getByRole('button', { name: 'Equip', exact: true }).click()
    await page.waitForTimeout(600)
    assert.equal(
      await stage.getByRole('status').count(),
      0,
      'cached switch settles'
    )
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    )
    assert.deepEqual(errors, [])
    await page.close()
    const live = await browser.newPage({
      viewport: { width, height: 900 },
      locale: 'en-US',
    })
    await live.goto('http://127.0.0.1:58000/')
    await live
      .getByRole('button', { name: 'Start exploring', exact: true })
      .click({ timeout: 120000 })
    await live
      .getByRole('button', { name: 'Pause game' })
      .waitFor({ timeout: 60000 })
    await live.evaluate(async () => {
      const source = performance
        .getEntriesByType('resource')
        .map((e) => e.name)
        .filter((url) => new URL(url).pathname === '/src/shared/state/game.ts')
        .at(-1)
      const { game } = await import(source || '/src/shared/state/game.ts')
      game.setState((s) => ({
        ...s,
        guestStatus: 'offline',
        unlocks: { owned: ['non-la'], equipped: {} },
      }))
    })
    let resume
    const held = new Promise((resolve) => {
      resume = resolve
    })
    await live.route('**/models/cosmetics/non-la.glb', async (route) => {
      await held
      await route.continue()
    })
    await live.keyboard.press('i')
    await live.getByRole('dialog', { name: 'Wardrobe', exact: true }).waitFor()
    await live.waitForTimeout(1500)
    await live.getByRole('button', { name: 'Equip', exact: true }).click()
    await live.locator('.wardrobe-stage-view .loading-panel').waitFor()
    await live.locator('.game-canvas .loading-panel').waitFor()
    resume()
    await live
      .locator('.wardrobe-stage-view .loading-panel')
      .waitFor({ state: 'hidden' })
    await live
      .locator('.game-canvas .loading-panel')
      .waitFor({ state: 'hidden' })
    await live.close()
    console.log(
      `${width}: delayed equip panel, full coverage, ready dismissal, cached switch, reduced motion, no overflow/errors`
    )
  }
} finally {
  await browser.close()
}

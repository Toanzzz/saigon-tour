import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(
  `${process.env.QA_MODULE_ROOT || '/private/tmp/saigon-tour-qa'}/package.json`
)
const { chromium } = require('playwright')
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROMIUM_PATH ||
    '/Users/toan/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
})
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({
      viewport: { width, height: 900 },
      locale: 'en-US',
      hasTouch: width === 390,
      isMobile: width === 390,
    })
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(process.env.GAME_URL || 'http://127.0.0.1:58000/')
    await page
      .getByRole('button', { name: 'Start exploring', exact: true })
      .click({ timeout: 120000 })
    await page
      .getByRole('button', { name: 'Pause game' })
      .waitFor({ timeout: 60000 })
    const fixture = await page.evaluate(async () => {
      const source = performance
        .getEntriesByType('resource')
        .map((e) => e.name)
        .filter((url) => new URL(url).pathname === '/src/shared/state/game.ts')
        .at(-1)
      const { game } = await import(source || '/src/shared/state/game.ts')
      const sourceCatalog = performance
        .getEntriesByType('resource')
        .map((e) => e.name)
        .find((url) => url.includes('/unlocks/index.ts'))
      const { UNLOCKS } = await import(sourceCatalog)
      const all = Object.values(UNLOCKS)
      const selected = ['hat', 'outfit', 'accessory', 'vehicle', 'pet'].map(
        (slot) => all.find((e) => e.slot === slot)
      )
      game.setState((s) => ({
        ...s,
        guestStatus: 'offline',
        unlocks: { owned: selected.map((e) => e.id), equipped: {} },
      }))
      return selected.map((e) => ({ id: e.id, slot: e.slot }))
    })
    await page.keyboard.press('i')
    const dialog = page.getByRole('dialog', { name: 'Wardrobe', exact: true })
    await dialog.waitFor()
    await assert.equal(
      await page
        .getByRole('tab', { name: 'All', exact: true })
        .getAttribute('aria-selected'),
      'true'
    )
    await assert.equal(await page.locator('.wardrobe-card').count(), 5)
    for (const [label, slot] of [
      ['Hat', 'hat'],
      ['Outfit', 'outfit'],
      ['Accessory', 'accessory'],
      ['Ride', 'vehicle'],
      ['Pet', 'pet'],
    ]) {
      await page.getByRole('tab', { name: label, exact: true }).click()
      assert.equal(await page.locator('.wardrobe-card').count(), 1)
      await page.getByRole('button', { name: 'Equip', exact: true }).click()
      await page.getByRole('button', { name: 'Unequip', exact: true }).waitFor()
      console.log(`${width} equipped ${slot}`)
    }
    await page.getByRole('tab', { name: 'All', exact: true }).click()
    assert.equal(await page.locator('.wardrobe-card.is-equipped').count(), 5)
    const stage = page.locator('.wardrobe-stage-view')
    await stage.scrollIntoViewIfNeeded()
    await page.waitForTimeout(3000)
    const before = await stage.screenshot()
    const box = await stage.boundingBox()
    if (width === 390) {
      const cdp = await page.context().newCDPSession(page)
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [
          { x: box.x + box.width * 0.25, y: box.y + box.height * 0.5 },
        ],
      })
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [
          { x: box.x + box.width * 0.75, y: box.y + box.height * 0.5 },
        ],
      })
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: [],
      })
    } else {
      await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.5)
      await page.mouse.down()
      await page.mouse.move(
        box.x + box.width * 0.75,
        box.y + box.height * 0.5,
        { steps: 10 }
      )
      await page.mouse.up()
    }
    await page.waitForTimeout(250)
    const after = await stage.screenshot()
    assert(!before.equals(after), 'drag changes rendered avatar')
    await page
      .getByRole('button', { name: 'Rotate avatar', exact: true })
      .focus()
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(100)
    const key = await stage.screenshot()
    assert(!after.equals(key), 'keyboard changes rendered avatar')
    await page.screenshot({ path: `/tmp/wardrobe-controls-${width}.png` })
    await page.locator('.dialog-heading button').click()
    await page.keyboard.press('i')
    assert.equal(
      await page
        .getByRole('tab', { name: 'All', exact: true })
        .getAttribute('aria-selected'),
      'true'
    )
    assert.equal(await page.locator('.wardrobe-card').count(), fixture.length)
    await page
      .locator('.wardrobe-card')
      .first()
      .getByRole('button', { name: 'Unequip', exact: true })
      .click()
    assert.equal(await page.locator('.wardrobe-card.is-equipped').count(), 4)
    await page
      .locator('.wardrobe-card')
      .first()
      .getByRole('button', { name: 'Equip', exact: true })
      .click()
    assert.equal(await page.locator('.wardrobe-card.is-equipped').count(), 5)
    await page.evaluate(async () => {
      const source = performance
        .getEntriesByType('resource')
        .map((e) => e.name)
        .filter((url) => new URL(url).pathname === '/src/shared/state/game.ts')
        .at(-1)
      const { game } = await import(source || '/src/shared/state/game.ts')
      game.setState((s) => ({ ...s, unlocks: { owned: [], equipped: {} } }))
    })
    await page.locator('.wardrobe-empty').waitFor()
    assert.equal(await page.locator('.wardrobe-card').count(), 0)
    await page.locator('.wardrobe-stage-view').scrollIntoViewIfNeeded()
    await page.waitForTimeout(1000)
    await page.screenshot({ path: `/tmp/wardrobe-full-character-${width}.png` })

    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    )
    assert.deepEqual(errors, [])
    console.log(
      `${width}: all categories, equip, drag, keyboard, reopen passed`
    )
    await page.close()
  }
} finally {
  await browser.close()
}

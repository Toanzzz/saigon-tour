import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(
  `${process.env.QA_MODULE_ROOT || '/private/tmp/saigon-tour-qa'}/package.json`
)
const { chromium } = require('playwright')
const browser = await chromium.launch({
  headless: true,
  executablePath:
    '/Users/toan/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
})
for (const width of process.env.CONTROL ? [1440] : [1440, 390]) {
  const page = await browser.newPage({
    viewport: { width, height: 900 },
    locale: 'en-US',
    hasTouch: width === 390,
  })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(process.env.GAME_URL || 'http://127.0.0.1:58000/?mapDebug=1')
  await page.getByRole('main', { name: 'Map inspector' }).waitFor()
  await page.waitForTimeout(1500)
  await page.getByRole('status').waitFor({ state: 'hidden', timeout: 120000 })
  await page.waitForTimeout(1500)
  await page.locator('select').selectOption('market')
  await page.waitForTimeout(1500)
  await page.screenshot({
    path: `/tmp/market-${process.env.CONTROL ? 'control' : 'fixed'}-${width}.png`,
  })
  if (!process.env.CONTROL) {
    for (const id of [
      'all',
      'park',
      'cityhall',
      'cathedral',
      'river',
      'opera',
      'postoffice',
      'alley',
    ]) {
      await page.locator('select').selectOption(id)
      await page.waitForTimeout(500)
      await page.screenshot({ path: `/tmp/map-${id}-${width}.png` })
    }
    const top = page.getByRole('button', { name: 'Top view' })
    await top.click()
    await assert.equal(await top.getAttribute('aria-pressed'), 'true')
    await page.getByLabel('Collision shapes').check()
    assert(await page.getByLabel('Collision shapes').isChecked())
    await page.getByLabel('Collision shapes').uncheck()
    await top.click()
    const canvas = page.locator('canvas')
    const box = await canvas.boundingBox()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.7)
    await page.mouse.down()
    await page.mouse.move(
      box.x + box.width / 2 + 60,
      box.y + box.height * 0.7 + 30,
      { steps: 6 }
    )
    await page.mouse.up()
    await page.mouse.wheel(0, -250)
    if (width === 390) {
      const cdp = await page.context().newCDPSession(page)
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: 195, y: 650 }],
      })
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: 245, y: 680 }],
      })
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: [],
      })
    }
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    )
    await page.getByRole('link', { name: 'Return to game' }).click()
    await page
      .getByRole('button', { name: 'Start exploring', exact: true })
      .waitFor({ timeout: 60000 })
  }
  assert.deepEqual(errors, [])
  console.log({ width, errors })
  await page.close()
}
await browser.close()

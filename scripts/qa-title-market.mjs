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
    await page.waitForFunction(
      () => window.__THREE_GAME_TEST_HOOKS__?.camera(),
      null,
      { timeout: 120000 }
    )
    const start = page.getByRole('button', {
      name: 'Start exploring',
      exact: true,
    })
    await start.waitFor()
    await page.waitForFunction(
      () => !document.querySelector('.title-start')?.disabled
    )
    await page.waitForTimeout(1800)
    assert.equal(
      await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.camera().fov),
      width === 390 ? 44 : 22
    )
    for (const selector of [
      '.title-name-row',
      '.title-start',
      '.title-legal',
    ]) {
      const rect = await page.locator(selector).boundingBox()
      assert(
        rect.x >= 0 && rect.x + rect.width <= width,
        `${selector} fits ${width}`
      )
    }
    await page.screenshot({ path: `/tmp/title-market-${width}.png` })
    await page.getByRole('button', { name: 'Tiếng Việt', exact: true }).click()
    await page.waitForFunction(() => document.documentElement.lang === 'vi')
    await page.getByRole('button', { name: 'English', exact: true }).click()
    await page.getByLabel('Your name', { exact: true }).fill('Market Visitor')
    await start.click()
    await page.waitForFunction(
      () =>
        !document.querySelector('.title-screen') &&
        window.__THREE_GAME_TEST_HOOKS__?.camera()?.fov === 49
    )
    // Populate a returning journey through the app store, then exercise Continue.
    await page.evaluate(async () => {
      const source = performance
        .getEntriesByType('resource')
        .map((entry) => entry.name)
        .filter((url) => new URL(url).pathname === '/src/shared/state/game.ts')
        .at(-1)
      const { game, update } = await import(
        source || '/src/shared/state/game.ts'
      )
      update({
        screen: 'title',
        world: { ...game.state.world, visitedLocations: ['market', 'park'] },
      })
    })
    const resume = page.getByRole('button', { name: /Continue journey/ })
    await resume.waitFor()
    await page.waitForTimeout(1600)
    await page.screenshot({ path: `/tmp/title-market-returning-${width}.png` })
    await resume.click()
    await page.waitForFunction(
      () => window.__THREE_GAME_TEST_HOOKS__?.camera()?.fov === 49
    )
    await page.getByRole('button', { name: 'Pause game' }).click()
    await page
      .getByRole('button', { name: 'Continue exploring', exact: true })
      .click()
    assert.deepEqual(errors, [])
    console.log(
      `${width}: title, language, start, returning journey, pause/resume passed`
    )
    await page.close()
  }
} finally {
  await browser.close()
}

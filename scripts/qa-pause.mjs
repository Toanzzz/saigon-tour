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
  for (const width of [1280, 390]) {
    const context = await browser.newContext({
      locale: 'en-US',
      viewport: { width, height: 844 },
      isMobile: width === 390,
      hasTouch: width === 390,
    })
    try {
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', (error) => errors.push(error.message))
      await page.goto(process.env.GAME_URL || 'http://127.0.0.1:58000/?debug=1')
      const start = page.getByRole('button', {
        name: 'Start exploring',
        exact: true,
      })
      await start.click({ timeout: 60000 })
      // Guest initialization can finish after the first title-screen click.
      await page
        .waitForFunction(
          () => window.__THREE_GAME_DIAGNOSTICS__?.state?.screen === 'playing',
          null,
          { timeout: 10000 }
        )
        .catch(async () => {
          await start.click()
          await page.waitForFunction(
            () => window.__THREE_GAME_DIAGNOSTICS__?.state?.screen === 'playing'
          )
        })
      await page.evaluate(() => {
        window.pauseEvents = { cancels: 0, escapes: [] }
        document.addEventListener(
          'cancel',
          () => window.pauseEvents.cancels++,
          true
        )
        window.addEventListener('keydown', (event) => {
          if (event.code === 'Escape')
            window.pauseEvents.escapes.push(event.defaultPrevented)
        })
      })
      const pause = page.locator('.pause-dialog')
      for (let press = 1; press <= 12; press++) {
        await page.keyboard.press('Escape')
        await page.waitForFunction(
          (open) =>
            Boolean(document.querySelector('.pause-dialog[open]')) === open,
          press % 2 === 1
        )
        if (press % 2 === 1) {
          assert.equal(await pause.isVisible(), true)
          // Escape must work when a dialog form control owns focus.
          await pause.locator('input[type="range"]').focus()
          await page.keyboard.down('Escape')
          await page.keyboard.down('Escape')
          await page.keyboard.up('Escape')
          await pause.waitFor({ state: 'detached' })
          await page.keyboard.press('Escape')
          await pause.waitFor({ state: 'visible' })
        }
        const state = await page.evaluate(async () => {
          const loadedModule = (path) => {
            const url = performance
              .getEntriesByType('resource')
              .map((entry) => entry.name)
              .find((name) => new URL(name).pathname === path)
            if (!url) throw new Error(`Module not loaded: ${path}`)
            return url
          }
          const { game } = await import(
            loadedModule('/src/shared/state/game.ts')
          )
          const { audio } = await import(
            loadedModule('/src/shared/audio/index.ts')
          )
          return { screen: game.state.screen, paused: audio.stats().paused }
        })
        assert.deepEqual(state, {
          screen: press % 2 === 1 ? 'paused' : 'playing',
          paused: press % 2 === 1,
        })
      }
      await page.keyboard.press('Escape')
      await pause.waitFor({ state: 'visible' })
      await pause.locator('.primary-button').click()
      await pause.waitFor({ state: 'detached' })
      await page.keyboard.press('Escape')
      await pause.waitFor({ state: 'visible' })
      const events = await page.evaluate(() => window.pauseEvents)
      assert.equal(events.cancels, 0, 'Escape never invokes native dismissal')
      assert.ok(events.escapes.length >= 14)
      assert.ok(events.escapes.every(Boolean), 'every Escape is consumed')
      assert.deepEqual(errors, [])
      console.log(`${width}px: repeated Escape, held key, focus, Resume passed`)
    } finally {
      await context.close()
    }
  }
} finally {
  await browser.close()
}

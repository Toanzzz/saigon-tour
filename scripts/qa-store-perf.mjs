import assert from 'node:assert/strict'
import {
  chromium,
  diagnostics,
  executablePath,
  openGame,
} from './qa-quest-flow.mjs'

const browser = await chromium.launch({ headless: true, executablePath })
const results = []
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
    await openGame(page)

    // Let the HUD settle, then read the baseline render count and marker.
    await page.waitForTimeout(500)
    const markerCxCy = () =>
      page.evaluate(() => {
        const marker = document.querySelector(
          '.minimap-button .neighborhood-map circle[fill="#fff6d6"]'
        )
        return marker
          ? [marker.getAttribute('cx'), marker.getAttribute('cy')]
          : null
      })

    const before = (await diagnostics(page)).state.gameUiRenders
    const markerBefore = await markerCxCy()

    // Walk for 2s via the keyboard (desktop) / touch stick (mobile).
    if (width === 390) {
      const stick = page.locator('.touch-stick')
      const box = await stick.boundingBox()
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.down()
      await page.mouse.move(box.x + box.width / 2, box.y + 6, { steps: 4 })
      await page.waitForTimeout(2000)
      await page.mouse.up()
    } else {
      await page.keyboard.down('w')
      await page.waitForTimeout(2000)
      await page.keyboard.up('w')
    }

    const after = (await diagnostics(page)).state.gameUiRenders
    const markerAfter = await markerCxCy()
    const moved =
      markerBefore &&
      markerAfter &&
      (markerBefore[0] !== markerAfter[0] || markerBefore[1] !== markerAfter[1])

    const renders = after - before
    results.push({ width, renders, markerBefore, markerAfter, moved, errors })

    // The HUD must not re-render per position write (10 Hz ⇒ ~20 over 2s before).
    assert.ok(renders <= 3, `GameUI re-rendered ${renders}× while walking`)
    assert.ok(moved, 'minimap "you" marker did not move while walking')
    assert.equal(errors.length, 0, `page errors: ${errors.join(', ')}`)

    await context.close()
  }
  console.log(JSON.stringify(results, null, 2))
  console.log('store-perf OK')
} finally {
  await browser.close()
}

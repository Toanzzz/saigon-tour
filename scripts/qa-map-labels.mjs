import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

/**
 * Minimap label + tracked-quest QA. Confirms place labels are transparent
 * (no opaque pill rect behind them) and centered on their place marker, and
 * that the tracked quest pin renders an animated pulse ring. Desktop + 390px.
 * Run unsandboxed.
 */
const require = createRequire(
  `${process.env.QA_MODULE_ROOT || '/private/tmp/saigon-tour-qa'}/package.json`
)
const { chromium } = require('playwright')
const out = path.resolve(process.env.QA_OUTPUT || 'artifacts/map-labels')
await mkdir(out, { recursive: true })
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROMIUM_PATH ||
    '/Users/toan/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  args: ['--enable-webgl'],
})
const reports = []

async function verify(viewport) {
  const mobile = viewport.width === 390
  const label = mobile ? 'mobile' : 'desktop'
  const context = await browser.newContext({
    locale: 'en-US',
    viewport,
    isMobile: mobile,
    hasTouch: mobile,
    deviceScaleFactor: 1,
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  const diag = () => page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__)
  const results = {}
  try {
    await page.goto(process.env.GAME_URL || 'http://127.0.0.1:58000/?debug=1')
    const start = page.getByRole('button', {
      name: 'Start exploring',
      exact: true,
    })
    await start.click({ timeout: 60000 })
    try {
      await page.waitForFunction(
        () => window.__THREE_GAME_DIAGNOSTICS__?.state?.screen === 'playing',
        { timeout: 30000 }
      )
    } catch {
      await start.click({ timeout: 5000 }).catch(() => {})
      await page.waitForFunction(
        () => window.__THREE_GAME_DIAGNOSTICS__?.state?.screen === 'playing',
        { timeout: 30000 }
      )
    }

    // Seed a tracked quest, then open the large map.
    await page.evaluate(() =>
      window.__THREE_GAME_TEST_HOOKS__.setState('quest')
    )
    await page.waitForFunction(
      () =>
        window.__THREE_GAME_DIAGNOSTICS__?.state?.trackedQuestId === 'q_demo',
      { timeout: 10000 }
    )
    // The quest state seeds an open dialogue; Escape closes it so the map key
    // (gated on `!dialogue`) works, then M opens the large neighborhood map.
    await page.keyboard.press('Escape')
    await page.waitForFunction(
      () => !window.__THREE_GAME_DIAGNOSTICS__?.state?.dialogue,
      { timeout: 5000 }
    )
    await page.keyboard.press('m')
    const svg = page.locator('svg.neighborhood-map.large')
    await svg.waitFor({ timeout: 5000 })

    // --- Transparent labels: no opaque pill rect behind label text. ---
    // The removed pill used fill="#fff6d6" with fillOpacity .82; the only
    // remaining #fff6d6 fill is the compass badge + player dot, never a label
    // background rect inside a label group.
    const labelPills = await svg
      .locator('text[stroke="#fff6d6"] + rect, g > rect[fill-opacity="0.82"]')
      .count()
    assert.equal(labelPills, 0, 'no translucent label pills remain')
    // Labels paint their outline under the fill (transparent background).
    const labelPaint = await svg.locator('text').evaluateAll((nodes) =>
      nodes
        .filter((n) => Number(n.getAttribute('font-size')) >= 3.5)
        .map((n) => ({
          text: n.textContent,
          stroke: getComputedStyle(n).stroke,
          paintOrder: getComputedStyle(n).paintOrder,
        }))
    )
    const named = labelPaint.filter((l) => l.text && l.text !== 'N')
    assert(named.length > 0, 'place labels present')
    for (const l of named) {
      assert(
        l.paintOrder.startsWith('stroke'),
        `${l.text} outlines under fill (paint-order=${l.paintOrder})`
      )
    }
    results.namedLabels = named.length

    // --- Centered labels: each place label's bbox center sits over its
    // stop marker circle center (same parent <g> transform). ---
    const centering = await svg.evaluate((root) => {
      const groups = [...root.querySelectorAll('g')]
      const samples = []
      for (const g of groups) {
        const circle = g.querySelector(':scope > circle[fill="#ee7448"]')
        const text = g.querySelector(':scope > text')
        if (!circle || !text) continue
        const tb = text.getBBox()
        samples.push({
          text: text.textContent,
          dx: tb.x + tb.width / 2,
          dy: tb.y + tb.height / 2,
        })
      }
      return samples
    })
    assert(centering.length > 0, 'found place label groups')
    for (const c of centering) {
      assert(
        Math.abs(c.dx) < 0.6 && Math.abs(c.dy) < 1.2,
        `${c.text} centered on marker (dx=${c.dx.toFixed(2)}, dy=${c.dy.toFixed(2)})`
      )
    }
    results.centeredLabels = centering.length

    // --- Tracked quest pin animates with a pulse ring. ---
    const trackedPin = svg.locator('g.quest-pin.tracked')
    assert.equal(await trackedPin.count(), 1, 'one tracked quest pin')
    const ring = trackedPin.locator('circle.quest-pin-ring')
    assert.equal(await ring.count(), 1, 'tracked pin renders pulse ring')
    const ringAnim = await ring.evaluate(
      (n) => getComputedStyle(n).animationName
    )
    assert.equal(ringAnim, 'quest-pin-ring', 'pulse ring is animated')
    const markAnim = await trackedPin
      .locator('path.quest-pin-mark')
      .evaluate((n) => getComputedStyle(n).animationName)
    assert.equal(markAnim, 'quest-pin-pulse', 'tracked mark pulses')
    results.trackedRingAnimation = ringAnim
    results.trackedMarkAnimation = markAnim

    await page.screenshot({ path: `${out}/${label}-map.png` })
    await page.getByRole('button', { name: 'Close panel', exact: true }).click()

    assert.deepEqual(errors, [], 'no page or console errors')
    const report = { viewport, results, errors }
    reports.push(report)
    await writeFile(
      `${out}/${label}.json`,
      `${JSON.stringify(report, null, 2)}\n`
    )
    console.log(
      `${label}: ${results.namedLabels} transparent labels, ` +
        `${results.centeredLabels} centered on markers, ` +
        `tracked pin ring=${results.trackedRingAnimation}, mark=${results.trackedMarkAnimation}`
    )
  } catch (error) {
    await page
      .screenshot({ path: `${out}/${label}-failure.png` })
      .catch(() => {})
    await writeFile(
      `${out}/${label}-failure.json`,
      JSON.stringify(
        { error: String(error), diagnostics: await diag(), errors },
        null,
        2
      )
    )
    throw error
  } finally {
    await context.close()
  }
}
try {
  await verify({ width: 1440, height: 900 })
  await verify({ width: 390, height: 844 })
  await writeFile(`${out}/report.json`, `${JSON.stringify(reports, null, 2)}\n`)
} finally {
  await browser.close()
}

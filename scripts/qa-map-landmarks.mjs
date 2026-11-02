import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

/**
 * Phase-2 landmark QA. Walk-in: teleport beside Bitexco and 42 Nguyễn Huệ,
 * walk at them with real keys, and confirm the player stops at the wall.
 * Minimap: the new landmark rects appear in the minimap SVG, and their labels
 * do not overlap the stop labels. Desktop and 390px. Run unsandboxed.
 */
const require = createRequire(
  `${process.env.QA_MODULE_ROOT || '/private/tmp/saigon-tour-qa'}/package.json`
)
const { chromium } = require('playwright')
const out = path.resolve(process.env.QA_OUTPUT || 'artifacts/map-landmarks')
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
  const teleport = async (x, z) => {
    await page.evaluate(
      ([a, b]) => window.__THREE_GAME_TEST_HOOKS__.teleport(a, b),
      [x, z]
    )
    await page.waitForFunction(
      ([a, b]) => {
        const p = window.__THREE_GAME_DIAGNOSTICS__?.state?.position
        return p && Math.hypot(p[0] - a, p[2] - b) < 0.6
      },
      [x, z],
      { timeout: 5000 }
    )
    await page.waitForTimeout(400)
  }
  // Walk south-to-north by holding W (moves toward −z at the default heading).
  const walkMinusZ = async (ms) => {
    await page.keyboard.down('w')
    await page.waitForTimeout(ms)
    await page.keyboard.up('w')
    await page.waitForTimeout(300)
  }
  const results = {}
  try {
    await page.goto(process.env.GAME_URL || 'http://127.0.0.1:58000/?debug=1')
    const start = page.getByRole('button', {
      name: 'Start exploring',
      exact: true,
    })
    await start.click({ timeout: 60000 })
    // A cold WebGL context (notably the second viewport) can be slow to reach
    // 'playing'; give it room and nudge once if it stalls on the title.
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
    await page.waitForFunction(
      () =>
        window.__THREE_GAME_DIAGNOSTICS__?.renderer?.render?.triangles > 1000
    )
    assert.equal(
      await page.locator('body').evaluate((node) => node.scrollWidth),
      viewport.width,
      'UI fits the viewport'
    )

    // --- Walk-in: Bitexco at (57, 29), footprint half-depth 3.2. ---
    await teleport(57, 36)
    await walkMinusZ(mobile ? 2600 : 2200)
    const bitexco = (await diag()).state.position
    // Stops before the solid edge at z = 32.2 (+ capsule): never past it.
    assert(
      bitexco[2] > 32,
      `player stops north of Bitexco wall (z=${bitexco[2].toFixed(2)})`
    )
    results.bitexcoStop = bitexco
    await page.screenshot({ path: `${out}/${label}-bitexco-walkin.png` })

    // --- Walk-in: 42 Nguyễn Huệ at (57, −8), footprint half-depth 2.5. ---
    await teleport(57, 1)
    await walkMinusZ(mobile ? 2600 : 2200)
    const cafe = (await diag()).state.position
    // Solid top edge z = −5.5; the player stops before it.
    assert(
      cafe[2] > -5.6,
      `player stops south of café apartments wall (z=${cafe[2].toFixed(2)})`
    )
    results.cafeStop = cafe
    await page.screenshot({ path: `${out}/${label}-cafe-walkin.png` })

    // --- Minimap: open the large neighborhood map and inspect the SVG. ---
    await page.getByRole('button', { name: 'Open neighborhood map' }).click()
    const svg = page.locator('svg.neighborhood-map.large')
    await svg.waitFor({ timeout: 5000 })
    // The two new landmark rects carry stable keys → stable DOM order.
    const landmarkRects = await svg.locator('rect[fill="#7c6cc6"]').count()
    assert.equal(landmarkRects, 2, 'both landmark rects render on the minimap')
    results.landmarkRects = landmarkRects

    // Label-overlap: landmark label bboxes must not intersect stop labels.
    const boxes = await svg.locator('text').evaluateAll((nodes) =>
      nodes.map((n) => {
        const b = n.getBBox()
        return { text: n.textContent, x: b.x, y: b.y, w: b.width, h: b.height }
      })
    )
    const bitexcoLabel = boxes.find((b) => b.text === 'Bitexco')
    const cafeLabel = boxes.find((b) => b.text === '42 Nguyen Hue')
    assert(bitexcoLabel && cafeLabel, 'both landmark labels present')
    const stopTexts = new Set([
      'BẾN THÀNH',
      'CÔNG VIÊN',
      'TÒA THỊ CHÍNH',
      'NHÀ THỜ ĐỨC BÀ',
      'BẾN SÔNG',
      'NHÀ HÁT THÀNH PHỐ',
      'BƯU ĐIỆN TRUNG TÂM',
      'HẺM ẨM THỰC',
    ])
    const intersects = (a, b) =>
      a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
    const overlaps = []
    for (const landmark of [bitexcoLabel, cafeLabel]) {
      for (const other of boxes) {
        if (!stopTexts.has(other.text)) continue
        if (intersects(landmark, other))
          overlaps.push(`${landmark.text} ↔ ${other.text}`)
      }
    }
    assert.deepEqual(overlaps, [], 'landmark labels clear of stop labels')
    results.labelOverlaps = overlaps
    await page.screenshot({ path: `${out}/${label}-minimap.png` })
    await page.getByRole('button', { name: 'Close panel', exact: true }).click()

    assert.deepEqual(errors, [], 'no page or console errors')
    const report = { viewport, results, errors }
    reports.push(report)
    await writeFile(
      `${out}/${label}.json`,
      `${JSON.stringify(report, null, 2)}\n`
    )
    console.log(
      `${label}: Bitexco stop z=${results.bitexcoStop[2].toFixed(2)}, ` +
        `café stop z=${results.cafeStop[2].toFixed(2)}, ` +
        `${results.landmarkRects} landmark rects, no label overlaps`
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

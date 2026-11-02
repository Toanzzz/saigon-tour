import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(
  `${process.env.QA_MODULE_ROOT || '/private/tmp/saigon-tour-qa'}/package.json`
)
const { chromium } = require('playwright')
const sharp = createRequire(
  '/Users/toan/code/hackathon/saigon-tour/package.json'
)('sharp')

const OUT = process.env.QA_OUTPUT || '/tmp/saigon-map-evidence'
await mkdir(OUT, { recursive: true })

// IMPORTANT: this script must run SOLO or OFFLINE. `setWeather('rain')` writes
// the client `city` store, but the next room snapshot overwrites it, so sample
// quickly after the call. Launch the dev server without a live room (or
// disconnected) and do not run it concurrently with another session.

const VIEWPORTS = [
  { label: 'desktop', width: 1440, height: 900 },
  { label: 'mobile', width: 390, height: 844 },
]

function hexToRgb(hex) {
  const n = Number.parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function deltaE(a, b) {
  const dr = a[0] - b[0]
  const dg = a[1] - b[1]
  const db = a[2] - b[2]
  return Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db)
}
function luminance([r, g, b]) {
  return 0.299 * r + 0.587 * g + 0.114 * b
}

const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROMIUM_PATH ||
    '/Users/toan/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  args: ['--enable-webgl'],
})

const reports = []

// WebGL canvases do not composite into a full-page screenshot in headless
// Chromium (returns black), so screenshot the CANVAS element and crop via sharp.
async function sampleCanvas(page, x, y, w, h) {
  const png = await page.locator('canvas').first().screenshot()
  const { data, info } = await sharp(png)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  let r = 0
  let g = 0
  let b = 0
  let n = 0
  for (let yy = y; yy < y + h && yy < info.height; yy++) {
    for (let xx = x; xx < x + w && xx < info.width; xx++) {
      const i = (info.width * yy + xx) << 2
      r += data[i]
      g += data[i + 1]
      b += data[i + 2]
      n++
    }
  }
  return [r / n, g / n, b / n]
}

/** The warmest pixel (max red-minus-blue) in a region — finds sparse glow. */
async function warmestPixel(page, x, y, w, h) {
  const png = await page.locator('canvas').first().screenshot()
  const { data, info } = await sharp(png)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  let best = [0, 0, 0]
  let bestWarmth = -1e9
  for (let yy = y; yy < y + h && yy < info.height; yy++) {
    for (let xx = x; xx < x + w && xx < info.width; xx++) {
      const i = (info.width * yy + xx) << 2
      const warmth = data[i] - data[i + 2]
      if (warmth > bestWarmth) {
        bestWarmth = warmth
        best = [data[i], data[i + 1], data[i + 2]]
      }
    }
  }
  return best
}

const diag = (page) => page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__)

async function setEvening(page, on) {
  const want = on ? 'evening' : 'day'
  if ((await diag(page)).state.timeOfDay === want) return
  await page.getByRole('button', { name: 'Pause game' }).click()
  const toggle = page.getByLabel('Evening city lights')
  on ? await toggle.check() : await toggle.uncheck()
  await page
    .getByRole('button', { name: 'Continue exploring', exact: true })
    .click()
  await page.waitForFunction(
    (expected) =>
      window.__THREE_GAME_DIAGNOSTICS__?.state?.timeOfDay === expected,
    want
  )
  await page.waitForTimeout(500)
}

async function setWeather(page, weather) {
  await page.evaluate(
    (w) => window.__THREE_GAME_TEST_HOOKS__.setWeather(w),
    weather
  )
}

async function startPlaying(page) {
  await page.waitForFunction(
    () => window.__THREE_GAME_TEST_HOOKS__?.camera?.() != null,
    { timeout: 30000 }
  )
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
  await page.waitForFunction(
    () => window.__THREE_GAME_DIAGNOSTICS__?.renderer?.render?.triangles > 1000
  )
  await page.waitForTimeout(800)
}

async function verify(viewport) {
  const mobile = viewport.width === 390
  const label = viewport.label
  const context = await browser.newContext({
    locale: 'en-US',
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: mobile,
    hasTouch: mobile,
    deviceScaleFactor: 1,
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  const report = { viewport, evening: {}, rain: {}, errors }
  try {
    await page.goto(process.env.GAME_URL || 'http://127.0.0.1:58000/?debug=1')
    await startPlaying(page)
    await page.evaluate(() =>
      window.__THREE_GAME_TEST_HOOKS__.hideDebugUi(true)
    )

    // --- Evening windows: warm cathedral panes --------------------------
    // Teleport in front of the cathedral façade and look at the lit windows.
    await page.evaluate(() =>
      window.__THREE_GAME_TEST_HOOKS__.teleport(88, -70)
    )
    await page.waitForTimeout(1200)
    await setEvening(page, true)
    await page.waitForTimeout(600)
    // Lit window quads are sparse against the evening façade, so find the
    // warmest pixel across the central heritage band rather than averaging
    // it (which blends the glow into the wall and sky).
    const cx = Math.round(viewport.width / 2)
    const windowSample = await warmestPixel(
      page,
      cx - 240,
      Math.round(viewport.height * 0.25),
      480,
      260
    )
    report.evening.windowSample = windowSample
    // Warm 3000 K glow: red clearly beats blue.
    assert(
      windowSample[0] - windowSample[2] > 30,
      `a warm 3000K window glows (r−b>30): ${JSON.stringify(windowSample)}`
    )

    // --- Evening neon: saturated cyan/magenta on the alley --------------
    await page.evaluate(() =>
      window.__THREE_GAME_TEST_HOOKS__.teleport(-20, 22)
    )
    await page.waitForTimeout(1200)
    const neonSample = await sampleCanvas(
      page,
      cx - 80,
      Math.round(viewport.height * 0.38),
      160,
      90
    )
    report.evening.neonSample = neonSample
    const cyan = hexToRgb('#19e3ff')
    const magenta = hexToRgb('#ff3dcb')
    const neonHit = Math.min(
      deltaE(neonSample, cyan),
      deltaE(neonSample, magenta)
    )
    report.evening.neonHit = neonHit
    // Saturation: the max and min channels are well separated.
    const sat = Math.max(...neonSample) - Math.min(...neonSample)
    report.evening.neonSaturation = sat
    assert(sat > 25, `alley neon is saturated (spread ${sat.toFixed(1)})`)

    // --- Rain: streaks present, umbrellas near market, darker road ------
    // Back to day. Sample a WIDE lower-road band as the baseline so a single
    // puddle glint or rain streak can't flip the comparison; the same band is
    // re-sampled under rain at the identical pose/heading.
    await setEvening(page, false)
    await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.teleport(29, 6))
    await page.waitForTimeout(1200)
    const roadBand = {
      x: cx - 200,
      y: Math.round(viewport.height * 0.64),
      w: 400,
      h: 150,
    }
    const roadClear = await sampleCanvas(
      page,
      roadBand.x,
      roadBand.y,
      roadBand.w,
      roadBand.h
    )
    report.rain.roadClear = roadClear

    // Re-set rain and poll until the override holds (room snapshots can revert
    // it) before sampling the streaks and wet road.
    let rainWeather = { weather: 'clear', rainStreaks: 0 }
    for (let attempt = 0; attempt < 8; attempt++) {
      await setWeather(page, 'rain')
      await page.waitForTimeout(450)
      rainWeather = (await diag(page)).weather
      if (rainWeather.weather === 'rain' && rainWeather.rainStreaks > 0) break
    }
    report.rain.diagnostics = rainWeather
    assert(
      rainWeather.weather === 'rain',
      'weather override held long enough to sample'
    )
    assert(
      rainWeather.rainStreaks > 0,
      `rain streak mesh present (${rainWeather.rainStreaks})`
    )
    const roadWet = await sampleCanvas(
      page,
      roadBand.x,
      roadBand.y,
      roadBand.w,
      roadBand.h
    )
    report.rain.roadWet = roadWet
    // Wet pavement reads darker than dry across the band (wetRoad tint wins
    // over the sparse light puddles/streaks).
    assert(
      luminance(roadWet) < luminance(roadClear),
      `wet road darker than clear (${luminance(roadWet).toFixed(1)} < ${luminance(roadClear).toFixed(1)})`
    )

    // Umbrellas near the market. Room weather is server-authoritative and can
    // revert the override, so re-set rain at the market pose and poll until it
    // actually holds before counting the open canopies.
    await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.teleport(-23, 6))
    await page.waitForTimeout(600)
    let umbrellaDiag = { umbrellas: 0, weather: 'clear' }
    for (let attempt = 0; attempt < 8; attempt++) {
      await setWeather(page, 'rain')
      await page.waitForTimeout(500)
      umbrellaDiag = (await diag(page)).weather
      if (umbrellaDiag.weather === 'rain' && umbrellaDiag.umbrellas > 0) break
    }
    report.rain.umbrellas = umbrellaDiag.umbrellas
    assert(
      umbrellaDiag.weather === 'rain',
      `rain override held at the market (${umbrellaDiag.weather})`
    )
    assert(
      umbrellaDiag.umbrellas > 0,
      `umbrellas open near the market (${umbrellaDiag.umbrellas})`
    )

    // --- Rain → clear: umbrellas fold, streaks gone --------------------
    await setWeather(page, 'clear')
    await page.waitForTimeout(1000)
    const clearDiag = (await diag(page)).weather
    report.rain.afterClear = {
      umbrellas: clearDiag.umbrellas,
      rainStreaks: clearDiag.rainStreaks,
    }
    assert(
      clearDiag.rainStreaks === 0,
      `streak mesh removed after clear (${clearDiag.rainStreaks})`
    )
    assert(
      clearDiag.umbrellas < umbrellaDiag.umbrellas,
      `umbrellas fold after clear (${clearDiag.umbrellas} < ${umbrellaDiag.umbrellas})`
    )

    assert.deepEqual(errors, [], 'no page errors')
    reports.push(report)
    await writeFile(
      path.join(OUT, `weather-${label}.json`),
      `${JSON.stringify(report, null, 2)}\n`
    )
    console.log(
      `${label}: windows warm, neon sat ${report.evening.neonSaturation.toFixed(1)}, ` +
        `rain streaks ${report.rain.diagnostics.rainStreaks}, umbrellas ${report.rain.umbrellas}→${report.rain.afterClear.umbrellas}`
    )
  } catch (error) {
    await page
      .screenshot({ path: path.join(OUT, `weather-${label}-failure.png`) })
      .catch(() => {})
    await writeFile(
      path.join(OUT, `weather-${label}-failure.json`),
      JSON.stringify(
        {
          error: String(error),
          report,
          diagnostics: await diag(page).catch(() => null),
        },
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
  for (const viewport of VIEWPORTS) await verify(viewport)
  await writeFile(
    path.join(OUT, 'weather-report.json'),
    `${JSON.stringify(reports, null, 2)}\n`
  )
} finally {
  await browser.close()
}
assert(reports.length > 0, 'verified at least one viewport')
console.log(`wrote weather evidence for ${reports.length} viewports to ${OUT}`)

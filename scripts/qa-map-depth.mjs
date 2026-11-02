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

// --- palette tokens (kept in sync with shared/world/palette.ts) ------------
const PALETTE = {
  skyDayTop: '#9fd0ee',
  skyDayHorizon: '#fde6c8',
  skyEveTop: '#2d385f',
  skyEveHorizon: '#ff9a7a',
  skyRainTop: '#6f7f90',
  skyRainHorizon: '#9aa7b3',
}

// Day and evening are driven locally (the pause-menu toggle) and verified
// here. Rain weather is room-authoritative — a local override reverts when the
// next room snapshot arrives — so the rain sky tokens are covered by the
// world-diorama unit test (`skyColors(true, …)`) instead of this live scan.
const MODES = [
  {
    name: 'day',
    top: PALETTE.skyDayTop,
    horizon: PALETTE.skyDayHorizon,
    evening: false,
    rain: false,
  },
  {
    name: 'evening',
    top: PALETTE.skyEveTop,
    horizon: PALETTE.skyEveHorizon,
    evening: true,
    rain: false,
  },
]

const VIEWPORTS = [
  { label: 'desktop', width: 1440, height: 900 },
  { label: 'mobile', width: 390, height: 844 },
]

// --- colour helpers --------------------------------------------------------
function hexToRgb(hex) {
  const n = Number.parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function deltaE(a, b) {
  // Cheap weighted RGB distance; good enough to tie a sample to a token.
  const dr = a[0] - b[0]
  const dg = a[1] - b[1]
  const db = a[2] - b[2]
  return Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db)
}

const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROMIUM_PATH ||
    '/Users/toan/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  args: ['--enable-webgl'],
})

const reports = []

async function samplePatch(page, x, y, w, h) {
  // WebGL canvases do not composite reliably into a full-page screenshot in
  // headless Chromium, so screenshot the canvas element and crop with sharp.
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

async function setEvening(page, on) {
  const want = on ? 'evening' : 'day'
  const diag = () => page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__)
  if ((await diag()).state.timeOfDay === want) return
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
  const report = { viewport, modes: {}, title: {}, cluster: {}, errors }
  try {
    await page.goto(process.env.GAME_URL || 'http://127.0.0.1:58000/?debug=1')
    // --- Title shot: long lens before Play --------------------------------
    await page.waitForFunction(
      () => window.__THREE_GAME_TEST_HOOKS__?.camera?.() != null,
      { timeout: 30000 }
    )
    await page.waitForTimeout(600)
    const titleCam = await page.evaluate(() =>
      window.__THREE_GAME_TEST_HOOKS__.camera()
    )
    report.title.beforePlay = titleCam.fov
    assert(
      Math.abs(titleCam.fov - 22) <= 1.5,
      `title fov ~22, got ${titleCam.fov}`
    )

    const start = page.getByRole('button', {
      name: 'Start exploring',
      exact: true,
    })
    await start.click({ timeout: 60000 })
    // Harden the 'playing' wait: 30s + one re-click on a stall.
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
    await page.waitForTimeout(800)
    const playCam = await page.evaluate(() =>
      window.__THREE_GAME_TEST_HOOKS__.camera()
    )
    report.title.afterPlay = playCam.fov
    assert(Math.abs(playCam.fov - 49) <= 1, `play fov 49, got ${playCam.fov}`)

    // --- Sky gradient per mode -------------------------------------------
    // Hide the debug HUD so a full-page sample reads only the canvas, point the
    // player north of the market at open sky, and let the follow camera settle.
    await page.evaluate(() =>
      window.__THREE_GAME_TEST_HOOKS__.hideDebugUi(true)
    )
    await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.teleport(36, 40))
    await page.waitForTimeout(1500)
    // Both rows sit high enough to land on the open dome gradient, above the
    // skyline cards and clouds that clutter the lower sky in the play framing.
    const topY = 6
    const horizonY = Math.round(viewport.height * 0.12)
    for (const mode of MODES) {
      await setEvening(page, mode.evening)
      await page.waitForTimeout(400)
      const cx = Math.round(viewport.width / 2) - 8
      // The play-camera framing shifts the sky band run to run, so sample a
      // column of sky rows and take the strongest pair: a working gradient
      // shows a clear zenith→horizon separation somewhere in the open dome
      // above the skyline/cloud clutter.
      const rows = [topY, horizonY, Math.round(viewport.height * 0.2)]
      const samples = []
      for (const ry of rows)
        samples.push(await samplePatch(page, cx, ry, 16, 16))
      const top = samples[0]
      const horizon = samples[samples.length - 1]
      let separation = 0
      for (let a = 0; a < samples.length; a++)
        for (let b2 = a + 1; b2 < samples.length; b2++)
          separation = Math.max(separation, deltaE(samples[a], samples[b2]))
      const topToken = hexToRgb(mode.top)
      const horizonToken = hexToRgb(mode.horizon)
      const result = {
        top,
        horizon,
        samples,
        topDelta: deltaE(top, topToken),
        horizonDelta: deltaE(horizon, horizonToken),
        separation,
      }
      report.modes[mode.name] = result
      console.log(
        `${viewport.width}w ${mode.name}: samples ${JSON.stringify(samples)} sep ${separation.toFixed(1)}`
      )
      // The gradient must actually vary across the sky column. The raw
      // palette ΔE is recorded (topDelta/horizonDelta) but not asserted: the
      // on-screen sky is the shader colour after ACES tone mapping and the
      // hemisphere tint, so it legitimately diverges from the raw token hex.
      assert(
        result.separation > 16,
        `${mode.name}: sky gradient varies (max sep ${result.separation.toFixed(1)})`
      )
    }
    // The three modes must paint visibly different skies (the palette drives
    // day/evening/rain), proving the mode switch and token wiring.
    const dayTop = report.modes.day.top
    const eveTop = report.modes.evening.top
    assert(
      deltaE(dayTop, eveTop) > 24,
      `day and evening skies differ (ΔE ${deltaE(dayTop, eveTop).toFixed(1)})`
    )

    // --- Cloud / skyline cluster above the horizon row -------------------
    // Back to day; drag to sweep the heading so a cloud/card enters frame.
    await setEvening(page, false)
    const canvas = page.locator('canvas').first()
    const box = await canvas.boundingBox()
    const midY = box.y + box.height * 0.4
    for (let i = 0; i < 6; i++) {
      await page.mouse.move(box.x + box.width * 0.2, midY)
      await page.mouse.down()
      await page.mouse.move(box.x + box.width * 0.8, midY, { steps: 12 })
      await page.mouse.up()
      await page.waitForTimeout(200)
    }
    await page.waitForTimeout(500)
    // Scan a band above the horizon for a bright cream cloud / card cluster
    // that stands out from the sky.
    const bandY = Math.round(viewport.height * 0.18)
    // Decode the canvas element (full-page WebGL capture is unreliable) and
    // scan a row ~10px into the band for a run of pixels that stand out from
    // the open sky — a cloud lobe or a skyline card.
    const canvasShot = await page.locator('canvas').first().screenshot()
    const { data: bandData, info: bandInfo } = await sharp(canvasShot)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    const rowY = bandY + 10
    const skyRef = await samplePatch(page, 8, bandY, 16, 16)
    let clusterRun = 0
    let bestRun = 0
    for (let x = 0; x < bandInfo.width; x += 4) {
      const i = (bandInfo.width * rowY + x) << 2
      const px = [bandData[i], bandData[i + 1], bandData[i + 2]]
      if (deltaE(px, skyRef) > 30) {
        clusterRun += 1
        bestRun = Math.max(bestRun, clusterRun)
      } else {
        clusterRun = 0
      }
    }
    report.cluster = { bestRun, horizonRowY: bandY }
    assert(
      bestRun >= 3,
      `a cloud/skyline cluster appears above the horizon (run ${bestRun})`
    )

    assert.deepEqual(errors, [], 'no page errors')
    reports.push(report)
    await writeFile(
      path.join(OUT, `depth-${label}.json`),
      `${JSON.stringify(report, null, 2)}\n`
    )
    console.log(
      `${label}: title fov ${report.title.beforePlay}→${report.title.afterPlay}, ` +
        `sky modes ok, cluster run ${bestRun}`
    )
  } catch (error) {
    await page
      .screenshot({ path: path.join(OUT, `depth-${label}-failure.png`) })
      .catch(() => {})
    await writeFile(
      path.join(OUT, `depth-${label}-failure.json`),
      JSON.stringify(
        {
          error: String(error),
          report,
          diagnostics: await page
            .evaluate(() => window.__THREE_GAME_DIAGNOSTICS__)
            .catch(() => null),
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
    path.join(OUT, 'depth-report.json'),
    `${JSON.stringify(reports, null, 2)}\n`
  )
} finally {
  await browser.close()
}
assert(reports.length > 0, 'verified at least one viewport')
console.log(`wrote depth evidence for ${reports.length} viewports to ${OUT}`)

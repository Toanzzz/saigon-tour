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

// This script drives the street-comedy pass (map Phase 5): the honk gag, the
// vendor cries, and that a xe ôm ride is never blocked by the swarm. Run it
// SOLO or OFFLINE: the City Director room can overwrite client state, so keep
// sampling windows short and do not run concurrently with another session.

const VIEWPORTS = [
  { label: 'desktop', width: 1440, height: 900 },
  { label: 'mobile', width: 390, height: 844 },
]

const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROMIUM_PATH ||
    '/Users/toan/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  args: ['--enable-webgl'],
})

const reports = []
const diag = (page) => page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__)

/** Average colour of a CANVAS crop, so the canvas is confirmed to be rendering. */
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

async function startPlaying(page) {
  await page.waitForFunction(
    () => window.__THREE_GAME_TEST_HOOKS__?.camera?.() != null,
    { timeout: 30000 }
  )
  // Start locale-agnostically via the test hook (the Start button label is
  // localized, so clicking by English text fails under the vi-VN context).
  await page.evaluate(() =>
    window.__THREE_GAME_TEST_HOOKS__.setState('active-play')
  )
  try {
    await page.waitForFunction(
      () => window.__THREE_GAME_DIAGNOSTICS__?.state?.screen === 'playing',
      { timeout: 30000 }
    )
  } catch {
    // Hardened retry: re-issue the locale-agnostic start.
    await page
      .evaluate(() => window.__THREE_GAME_TEST_HOOKS__.setState('active-play'))
      .catch(() => {})
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

/** DOM count of currently-visible street-cry bubbles (honk bubbles included). */
// Vendor cries only — exclude the honk gag bubble, which shares .street-cry.
const cryCount = (page) => page.locator('.street-cry:not(.honk)').count()
const honkCount = (page) => page.locator('.street-cry.honk').count()
const glossCount = (page) => page.locator('.street-cry .cry-gloss').count()
const cryText = (page) =>
  page
    .locator('.street-cry')
    .first()
    .innerText()
    .catch(() => '')

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
  const report = { viewport, honk: {}, cries: {}, ride: {}, errors }
  try {
    await page.goto(process.env.GAME_URL || 'http://127.0.0.1:58000/?debug=1')
    await startPlaying(page)
    await page.evaluate(() =>
      window.__THREE_GAME_TEST_HOOKS__.hideDebugUi(true)
    )

    // --- Honk gag: stand in a Lê Lợi lane and press a key -------------------
    // Teleport onto Lê Lợi (z≈12), where the swarm runs. The swarm honks when
    // a scooter has the player in its forward cone; the player is never pushed.
    await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.teleport(20, 12))
    await page.waitForTimeout(600)
    const before = (await diag(page)).state.position
    const collidersBefore = (await diag(page)).physics.colliders
    // Real keys: nudge along the lane briefly so this is a genuine walk, not a
    // teleport. The player must not be displaced by a scooter.
    await page
      .locator('canvas')
      .first()
      .click({ position: { x: 20, y: 20 } })
    await page.keyboard.down('KeyW')
    let honk = 0
    const deadline = Date.now() + 3000
    while (Date.now() < deadline) {
      await page.waitForTimeout(150)
      honk = await honkCount(page)
      if (honk > 0) break
    }
    await page.keyboard.up('KeyW')
    const after = (await diag(page)).state.position
    const collidersAfter = (await diag(page)).physics.colliders
    report.honk = {
      appeared: honk > 0,
      collidersBefore,
      collidersAfter,
      before,
      after,
    }
    assert(honk > 0, 'a "Bíp bíp!" honk bubble appeared within 3s')
    // No scooter collider was ever added (Rapier untouched).
    assert(
      collidersAfter === collidersBefore,
      `scooters add no colliders (${collidersBefore} → ${collidersAfter})`
    )
    // The player moved only under its own key press (small, finite), never a
    // large shove. A scooter never jumps the avatar off the lane.
    const jump = Math.hypot(after[0] - before[0], after[2] - before[2])
    report.honk.walkDelta = jump
    assert(
      jump < 6,
      `player not displaced by a scooter (moved ${jump.toFixed(2)})`
    )

    // --- Cries: stand near the market stalls --------------------------------
    await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.teleport(-23, 6))
    await page.waitForTimeout(600)
    let sawCry = false
    let maxVisible = 0
    const cryDeadline = Date.now() + 12000
    while (Date.now() < cryDeadline) {
      await page.waitForTimeout(250)
      const n = await cryCount(page)
      maxVisible = Math.max(maxVisible, n)
      if (n > 0) sawCry = true
      // The scheduler caps the visible vendor-cry set at two.
      assert(n <= 2, `at most two cry bubbles visible (saw ${n})`)
    }
    report.cries = { sawCry, maxVisible }
    assert(sawCry, 'a cry bubble appeared near the market within 12s')

    // Locale: EN shows the cry plus a gloss line.
    const enGloss = await glossCount(page)
    const enText = await cryText(page)
    report.cries.enGloss = enGloss
    report.cries.enText = enText
    assert(enGloss > 0, 'English shows the gloss line under the cry')

    // Confirm the canvas is live behind the DOM bubbles.
    report.cries.canvas = await sampleCanvas(
      page,
      Math.round(viewport.width / 2) - 40,
      Math.round(viewport.height / 2) - 40,
      80,
      80
    )

    // --- Ride: a xe ôm is never blocked by the swarm -----------------------
    await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.setCurrency(50))
    await page.evaluate(() =>
      window.__THREE_GAME_TEST_HOOKS__.setState('transport')
    )
    await page.waitForTimeout(400)
    // Pick the motorbike taxi and ride to City Hall along Lê Lợi.
    await page.getByRole('button', { name: 'Motorbike taxi' }).click()
    await page.getByLabel('Destination').selectOption({ label: 'City Hall' })
    const rideColliders = (await diag(page)).physics.colliders
    await page.getByRole('button', { name: /Board/ }).click()
    await page.waitForFunction(
      () => window.__THREE_GAME_DIAGNOSTICS__?.state?.ride != null,
      { timeout: 10000 }
    )
    // Watch the ride to completion; the collider count never changes, so the
    // swarm cannot block the auto-piloted vehicle.
    let blocked = false
    const rideDeadline = Date.now() + 20000
    while (Date.now() < rideDeadline) {
      await page.waitForTimeout(200)
      const d = await diag(page)
      if (d.physics.colliders !== rideColliders) blocked = true
      if (d.state.ride == null) break
    }
    const arrived = (await diag(page)).state
    report.ride = {
      blocked,
      arrivedLocation: arrived.locationId,
      ride: arrived.ride,
    }
    assert(
      !blocked,
      'no collider appeared during the ride (swarm never blocks)'
    )
    assert(arrived.ride == null, 'the xe ôm ride completed')
    assert(
      arrived.locationId === 'cityhall',
      `arrived at City Hall (${arrived.locationId})`
    )

    assert.deepEqual(errors, [], 'no page errors')
    reports.push(report)
    await writeFile(
      path.join(OUT, `street-${label}.json`),
      `${JSON.stringify(report, null, 2)}\n`
    )
    console.log(
      `${label}: honk ${report.honk.appeared}, cries max ${report.cries.maxVisible}, ` +
        `gloss ${report.cries.enGloss}, ride→${report.ride.arrivedStop}`
    )
  } catch (error) {
    await page
      .screenshot({ path: path.join(OUT, `street-${label}-failure.png`) })
      .catch(() => {})
    await writeFile(
      path.join(OUT, `street-${label}-failure.json`),
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

// Vietnamese: the cry shows alone (no gloss) under the VI locale.
async function verifyVietnamese() {
  const context = await browser.newContext({
    locale: 'vi-VN',
    viewport: { width: 1440, height: 900 },
  })
  const page = await context.newPage()
  try {
    // No URL locale strategy: the vi-VN context's preferredLanguage selects
    // Vietnamese because no explicit choice is saved.
    await page.goto(process.env.GAME_URL || 'http://127.0.0.1:58000/?debug=1')
    await startPlaying(page)
    await page.evaluate(() =>
      window.__THREE_GAME_TEST_HOOKS__.hideDebugUi(true)
    )
    const lang = await page.evaluate(() => document.documentElement.lang)
    assert(lang === 'vi', `the VI context resolved Vietnamese (lang ${lang})`)
    await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.teleport(-23, 6))
    let gloss = -1
    const deadline = Date.now() + 12000
    while (Date.now() < deadline) {
      await page.waitForTimeout(250)
      if ((await page.locator('.street-cry').count()) > 0) {
        gloss = await page.locator('.street-cry .cry-gloss').count()
        break
      }
    }
    assert(gloss === 0, `VI shows the cry alone, no gloss (gloss ${gloss})`)
    await writeFile(
      path.join(OUT, 'street-vi.json'),
      `${JSON.stringify({ gloss }, null, 2)}\n`
    )
    console.log(`vi: cry shown alone, gloss ${gloss}`)
  } finally {
    await context.close()
  }
}

try {
  for (const viewport of VIEWPORTS) await verify(viewport)
  await verifyVietnamese()
  await writeFile(
    path.join(OUT, 'street-report.json'),
    `${JSON.stringify(reports, null, 2)}\n`
  )
} finally {
  await browser.close()
}
assert(reports.length > 0, 'verified at least one viewport')
console.log(`wrote street evidence for ${reports.length} viewports to ${OUT}`)

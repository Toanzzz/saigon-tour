import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(
  `${process.env.QA_MODULE_ROOT || '/private/tmp/saigon-tour-qa'}/package.json`
)
const { chromium } = require('playwright')

const OUT = process.env.QA_OUTPUT || '/tmp/saigon-map-evidence'
await mkdir(OUT, { recursive: true })

// --- CLI: --compare <file> --calls +N --tris +N ----------------------------
const argv = process.argv.slice(2)
const arg = (name) => {
  const i = argv.indexOf(name)
  return i >= 0 ? argv[i + 1] : undefined
}
const compareFile = arg('--compare')
const callCap = Number(arg('--calls') ?? 0)
const trisCap = Number(arg('--tris') ?? 0)

// Four fixed poses at the default heading. SPAWN is [-23, 0.9, 10].
const POSES = [
  { name: 'spawn', x: -23, z: 10 },
  { name: 'nguyen-hue', x: 69, z: 0 },
  { name: 'cathedral', x: 88, z: -58 }, // PLACES.cathedral.stop
  { name: 'alley', x: -5, z: 29 }, // PLACES.alley.stop
]

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

const all = {}

async function teleport(page, x, z) {
  await page.evaluate(
    ([a, b]) => window.__THREE_GAME_TEST_HOOKS__.teleport(a, b),
    [x, z]
  )
  await page.waitForFunction(
    ([a, b]) => {
      const p = window.__THREE_GAME_DIAGNOSTICS__?.state?.position
      return p && Math.hypot(p[0] - a, p[2] - b) < 0.8
    },
    [x, z],
    { timeout: 6000 }
  )
  await page.waitForTimeout(900)
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
  await page.waitForTimeout(400)
}

async function sample(page) {
  await page.waitForTimeout(400)
  const diag = await page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__)
  return {
    calls: diag.renderer.render.calls,
    triangles: diag.renderer.render.triangles,
  }
}

async function measure(viewport) {
  const mobile = viewport.width === 390
  const context = await browser.newContext({
    locale: 'en-US',
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: mobile,
    hasTouch: mobile,
    deviceScaleFactor: 1,
  })
  const page = await context.newPage()
  try {
    await page.goto(process.env.GAME_URL || 'http://127.0.0.1:58000/?debug=1')
    await page
      .getByRole('button', { name: 'Start exploring', exact: true })
      .click({ timeout: 60000 })
    await page.waitForFunction(
      () => window.__THREE_GAME_DIAGNOSTICS__?.state?.screen === 'playing',
      { timeout: 15000 }
    )
    await page.waitForFunction(
      () =>
        window.__THREE_GAME_DIAGNOSTICS__?.renderer?.render?.triangles > 1000
    )
    for (const time of ['day', 'evening']) {
      await setEvening(page, time === 'evening')
      for (const pose of POSES) {
        await teleport(page, pose.x, pose.z)
        const result = await sample(page)
        const label = `${viewport.label}-${time}`
        all[label] ??= {}
        all[label][pose.name] = result
        console.log(
          `${label} ${pose.name}: ${result.calls} calls / ${result.triangles} tris`
        )
      }
    }
  } finally {
    await context.close()
  }
}

try {
  for (const viewport of VIEWPORTS) await measure(viewport)
} finally {
  await browser.close()
}

// --- write one file per (viewport, time) -----------------------------------
for (const [label, poses] of Object.entries(all)) {
  await writeFile(
    path.join(OUT, `perf-${label}.json`),
    `${JSON.stringify({ label, poses }, null, 2)}\n`
  )
}

// --- optional comparison gate ----------------------------------------------
if (compareFile) {
  const baseline = {}
  // The compare file may be a single (viewport,time) file or a directory-style
  // merged map; accept both a `{poses}` object and a `{label:{pose}}` map.
  const raw = JSON.parse(await readFile(compareFile, 'utf8'))
  if (raw.poses) baseline[raw.label] = raw.poses
  else Object.assign(baseline, raw)
  const failures = []
  for (const [label, poses] of Object.entries(all)) {
    const base = baseline[label] ?? baseline[Object.keys(baseline)[0]]?.poses
    if (!base) continue
    for (const [pose, value] of Object.entries(poses)) {
      const ref = base[pose]
      if (!ref) continue
      if (value.calls > ref.calls + callCap)
        failures.push(
          `${label} ${pose}: ${value.calls} calls > ${ref.calls}+${callCap}`
        )
      if (value.triangles > ref.triangles + trisCap)
        failures.push(
          `${label} ${pose}: ${value.triangles} tris > ${ref.triangles}+${trisCap}`
        )
    }
  }
  if (failures.length) {
    console.error(`perf regression:\n${failures.join('\n')}`)
    process.exit(1)
  }
  console.log('within cap vs baseline')
}
assert(Object.keys(all).length > 0, 'measured at least one viewport')
console.log(`wrote ${Object.keys(all).length} perf files to ${OUT}`)

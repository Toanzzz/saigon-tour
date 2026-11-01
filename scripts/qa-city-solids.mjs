import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import {
  chromium,
  diagnostics,
  executablePath,
  openGame,
  teleport,
} from './qa-quest-flow.mjs'

/**
 * Walk the player into a wide building's façade with real controls and assert
 * the collider stops them before they reach the building centre. Confirms the
 * solids-registry colliders match the visual footprints in-game.
 */
const browser = await chromium.launch({ headless: true, executablePath })
const out = process.env.QA_OUTPUT || 'artifacts/city-solids'
await mkdir(out, { recursive: true })
const results = []

// [label, approach point, drive axis/dir, building centre, stop threshold]
const walks = [
  // building-e @ (-22,-34), yaw 0: approach from the south (+z side), drive -z.
  {
    label: 'building-e@-22,-34',
    from: [-22, -26],
    key: 'w',
    axis: 2,
    centre: [-22, -34],
    stopBefore: -31,
  },
  // Wide building-j @ (44,24), yaw -π/2: approach from the west, drive +x.
  {
    label: 'building-j@44,24',
    from: [36, 24],
    key: 'd',
    axis: 0,
    centre: [44, 24],
    moveMin: 37.5,
    stopAfterMax: 40,
  },
]

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
    // Collider count must include every solid plus the ground slab.
    const colliders = (await diagnostics(page)).physics.colliders
    assert(colliders > 60, `expected many colliders, saw ${colliders}`)

    for (const walk of walks) {
      await teleport(page, walk.from[0], walk.from[1])
      await page.keyboard.down(walk.key)
      await page.waitForTimeout(2200)
      await page.keyboard.up(walk.key)
      await page.waitForTimeout(300)
      const at = (await diagnostics(page)).state.position
      if (walk.stopBefore !== undefined) {
        assert(
          at[walk.axis] > walk.stopBefore,
          `${walk.label}: stopped at ${at[walk.axis].toFixed(2)}, expected > ${walk.stopBefore}`
        )
      }
      if (walk.moveMin !== undefined) {
        assert(
          at[walk.axis] > walk.moveMin,
          `${walk.label}: only reached ${at[walk.axis].toFixed(2)}, expected > ${walk.moveMin}`
        )
      }
      if (walk.stopAfterMax !== undefined) {
        assert(
          at[walk.axis] < walk.stopAfterMax,
          `${walk.label}: reached ${at[walk.axis].toFixed(2)}, expected < ${walk.stopAfterMax}`
        )
      }
      results.push({ width, label: walk.label, position: at, colliders })
    }
    await page.screenshot({ path: `${out}/debug-${width}.png` })
    assert.deepEqual(errors, [])
    await context.close()
  }
  await writeFile(`${out}/city-solids.json`, JSON.stringify(results, null, 2))
  process.stdout.write(`city-solids OK: ${JSON.stringify(results)}\n`)
} finally {
  await browser.close()
}

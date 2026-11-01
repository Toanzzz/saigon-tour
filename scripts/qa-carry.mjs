/**
 * QA for the fragile parcel gag (Phase 1b). Follows the plan's six steps:
 *   1. Accept Tâm's wedding-cake errand.
 *   2. Talk to Mai; the twist moves the recipient to Ông Ba.
 *   3. Sprint in a zig-zag; the care level climbs to at least wobbly.
 *   4. Ride a xe ôm toward the river.
 *   5. Give the cake to Ba and check the reaction toast.
 *   6. Return to Tâm and check the payoff.
 *
 * Chromium is killed inside the sandbox (EPERM/SIGABRT); run unsandboxed.
 * Launch/teleport/test-hook conventions mirror scripts/qa-quest-flow.mjs.
 */
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import {
  activate,
  diagnostics,
  dismiss,
  meet,
  openGame,
  teleport,
} from './qa-quest-flow.mjs'

const require = (await import('node:module')).createRequire(
  `${process.env.QA_MODULE_ROOT || '/private/tmp/saigon-tour-qa'}/package.json`
)
const { chromium } = require('playwright')
const executablePath =
  process.env.CHROMIUM_PATH ||
  '/Users/toan/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
const out = process.env.QA_OUTPUT || '/tmp/saigon-carry'
await mkdir(out, { recursive: true })

const locations = { river: [23, 29] }
const itemLabels = { cake: 'wedding cake' }

const carry = (page) =>
  page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.carry())

/** Offer Tâm's cake errand by asking for an errand. */
async function acceptCake(page) {
  await meet(page, 'tam')
  await page.getByLabel('Your message').fill('Any errands?')
  await page.getByRole('button', { name: 'Send message', exact: true }).click()
  await page.waitForFunction(
    () =>
      window.__THREE_GAME_DIAGNOSTICS__?.state.quests?.some(
        (q) => q.giverNpcId === 'tam'
      ),
    null,
    { timeout: 30000 }
  )
  await dismiss(page)
}

/** Zig-zag sprint on foot so the cake wobbles. */
async function zigzagSprint(page) {
  await activate(page)
  await page.keyboard.down('Shift')
  for (const key of ['w', 'a', 'w', 'd', 'w', 'a']) {
    await page.keyboard.down(key)
    await page.waitForTimeout(260)
    await page.keyboard.up(key)
  }
  await page.keyboard.up('Shift')
  await page.waitForTimeout(400)
}

async function run(size) {
  const browser = await chromium.launch({
    headless: true,
    executablePath,
    args: ['--enable-webgl'],
  })
  const page = await browser.newPage({ locale: 'en-US', viewport: size })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await openGame(page)

  // 1. Accept the cake.
  await acceptCake(page)
  const accepted = (await diagnostics(page)).state.quests.find(
    (q) => q.giverNpcId === 'tam'
  )
  assert(accepted, 'Tâm offered the wedding cake errand')

  // 2. Talk to Mai; the twist retargets the delivery to Ba.
  await meet(page, 'mai')
  await page.waitForFunction(
    () =>
      window.__THREE_GAME_DIAGNOSTICS__?.state.quests
        ?.find((q) => q.giverNpcId === 'tam')
        ?.steps?.some((s) => s.type === 'DELIVER' && s.npcId === 'ba'),
    null,
    { timeout: 30000 }
  )
  await dismiss(page)

  // 3. Zig-zag sprint; the care level must climb off pristine.
  await zigzagSprint(page)
  await page.screenshot({ path: `${out}/carry-wobbly-${size.width}.png` })
  const wobbled = await carry(page)
  assert(wobbled.care !== 'pristine', `care climbed, got ${wobbled.care}`)

  // 4. Ride a xe ôm toward the river.
  await teleport(page, ...locations.river)

  // 5. Give the cake to Ba; a reaction toast fires.
  await meet(page, 'ba')
  await page
    .getByRole('button', {
      name: `Give ${itemLabels.cake}`,
      exact: true,
    })
    .click()
  await page.locator('.toast, .hud-toast').first().waitFor({ timeout: 30000 })
  await page.screenshot({ path: `${out}/carry-reaction-${size.width}.png` })

  // 6. Return to Tâm; the payoff plays on completion.
  const before = (await diagnostics(page)).state.completed
  await meet(page, 'tam')
  await page.waitForFunction(
    (before) => window.__THREE_GAME_DIAGNOSTICS__?.state.completed > before,
    before,
    { timeout: 30000 }
  )
  await page.screenshot({ path: `${out}/carry-payoff-${size.width}.png` })

  console.log(JSON.stringify({ size, wobbled, errors }))
  assert.deepEqual(errors, [])
  await browser.close()
}

await run({ width: 1440, height: 900 })
await run({ width: 390, height: 844 })

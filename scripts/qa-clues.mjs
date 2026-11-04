import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import {
  buyGood,
  chromium,
  diagnostics,
  dismiss,
  executablePath,
  meet,
  offerQuest,
  openGame,
  teleport,
} from './qa-quest-flow.mjs'

// Phase 3 clues-and-rides QA. Deterministic A/B/C runs across locale + width.
// Launch is EPERM-killed in the sandbox; run this unsandboxed with a live dev
// server, never from the agent.

const locations = {
  market: [-23, 7],
  park: [24, -2],
  cathedral: [88, -65],
  opera: [88, -35],
  postoffice: [100, -75],
}

const hooks = (page, name, ...args) =>
  page.evaluate(
    ([name, args]) => window.__THREE_GAME_TEST_HOOKS__?.[name]?.(...args),
    [name, args]
  )

/** Keep asking the given giver until it offers a quest carrying a riddle. */
async function offerRiddle(page, giver) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const offered = await offerQuest(page, giver)
    if (offered.riddle) return offered
    await dismiss(page)
    await page
      .getByRole('button', { name: 'Abandon errand', exact: true })
      .click()
      .catch(() => {})
  }
  throw new Error(`No riddle offered by ${giver}`)
}

// MODES order in the transport panel, so a mode maps to its `.ride-choice` index.
const MODE_ORDER = ['bus', 'xeom', 'cyclo', 'metro']

/**
 * Board a ride to `to` on `mode` via the transport panel. Opens the panel at the
 * current stop, selects the mode and destination, then boards. Locale-agnostic:
 * it clicks by position and the destination <option> value, not by label.
 */
async function ride(page, to, mode) {
  await page.getByRole('button', { name: 'Choose a ride', exact: true }).click()
  await page.locator('.ride-choice').nth(MODE_ORDER.indexOf(mode)).click()
  await page.locator('#ride-destination').selectOption(to)
  await page.locator('button.primary-button.wide').last().click()
  await page.waitForFunction(
    () => window.__THREE_GAME_DIAGNOSTICS__?.state.ride != null,
    null,
    { timeout: 30000 }
  )
}

const browser = await chromium.launch({ headless: true, executablePath })
const out = process.env.QA_OUTPUT || 'artifacts/clues'
const results = []
await mkdir(out, { recursive: true })
try {
  for (const [locale, width] of [
    ['en-US', 1440],
    ['vi-VN', 1440],
    ['en-US', 390],
    ['vi-VN', 390],
  ]) {
    const context = await browser.newContext({
      locale,
      viewport: { width, height: width === 390 ? 844 : 900 },
      isMobile: width === 390,
      hasTouch: width === 390,
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (error) => errors.push(error.stack ?? error.message))
    await openGame(page)

    // Run A: Thảo's riddle. Riddle text shows, no pin. A cyclo reveals it.
    const riddle = await offerRiddle(page, 'thao')
    assert(riddle.riddle, 'Thảo offered a riddle')
    await dismiss(page)
    // While hidden, the map shows no pin for this quest.
    const hiddenPins = await page.evaluate(
      (title) =>
        [...document.querySelectorAll('svg title')].filter((node) =>
          node.textContent?.includes(`Errand target: ${title}`)
        ).length,
      riddle.title
    )
    assert.equal(hiddenPins, 0, 'no pin while the riddle hides the step')
    await page.screenshot({ path: `${out}/a-riddle-${locale}-${width}.png` })
    // Ride a cyclo; the gossip reveals the riddle and the pin appears.
    await teleport(page, ...locations.market)
    await ride(page, 'cathedral', 'cyclo')
    await page.waitForFunction(
      (id) =>
        window.__THREE_GAME_DIAGNOSTICS__?.state.quests?.find(
          (q) => q.id === id
        )?.revealed === 'cyclo',
      riddle.id,
      { timeout: 30000 }
    )
    const afterRide = (await diagnostics(page)).state.quests.find(
      (q) => q.id === riddle.id
    )
    assert.notEqual(
      afterRide.revealed,
      'solved',
      'A: no sharp eye after a ride'
    )
    await dismiss(page)

    // Run B: solve a fresh riddle on foot before any reveal => Sharp eye + Thrifty.
    await page
      .getByRole('button', { name: 'Abandon errand', exact: true })
      .click()
      .catch(() => {})
    const solo = await offerRiddle(page, 'alex')
    await dismiss(page)
    const first = solo.steps[0]
    if (first.type === 'GO_TO')
      await teleport(page, ...locations[first.locationId])
    else await meet(page, first.npcId)
    await page.waitForFunction(
      (id) =>
        window.__THREE_GAME_DIAGNOSTICS__?.state.quests?.find(
          (q) => q.id === id
        )?.revealed === 'solved',
      solo.id,
      { timeout: 30000 }
    )
    await meet(page, 'alex')
    await page.waitForFunction(
      () =>
        document.body.textContent?.includes('Sharp eye') ||
        document.body.textContent?.includes('Mắt tinh'),
      null,
      { timeout: 30000 }
    )
    await page.screenshot({ path: `${out}/b-bonus-${locale}-${width}.png` })

    // Run C: drain coins, then a BUY step succeeds on credit.
    const buy = await offerQuest(page, 'hoa')
    const buyStep = buy.steps.find((step) => step.type === 'BUY')
    if (buyStep) {
      await dismiss(page)
      await hooks(page, 'setCurrency', 0)
      await buyGood(page, buyStep.marketItemId)
      await page.waitForFunction(
        (id) =>
          window.__THREE_GAME_DIAGNOSTICS__?.state.quests
            ?.find((q) => q.id === id)
            ?.progress.some(Boolean),
        buy.id,
        { timeout: 30000 }
      )
      assert.equal(
        (await diagnostics(page)).state.currency,
        0,
        'credit purchase charged no coins'
      )
      await page.screenshot({ path: `${out}/c-credit-${locale}-${width}.png` })
    }

    assert.equal(
      await page.evaluate(() => document.body.scrollWidth > innerWidth),
      false,
      'no horizontal overflow'
    )
    results.push({ locale, width, riddle, solo, buy, errors })
    await writeFile(`${out}/clues.json`, JSON.stringify(results, null, 2))
    assert.deepEqual(errors, [])
    await context.close()
  }
  await writeFile(`${out}/clues.json`, JSON.stringify(results, null, 2))
} finally {
  await browser.close()
}

import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import {
  chromium,
  diagnostics,
  dismiss,
  executablePath,
  gameUrl,
  meet,
  openGame,
  teleport,
} from './qa-quest-flow.mjs'

// City-centre coordinates for GO_TO steps the base errands visit.
const locations = {
  market: [-23, 7],
  park: [24, -2],
  cathedral: [88, -65],
  cityhall: [69, -8],
  river: [23, 29],
  opera: [88, -35],
  postoffice: [100, -75],
  alley: [-24, 28],
}
const itemLabels = {
  'coffee-beans': 'hạt cà phê',
  'sheet-music': 'bản nhạc',
  lanterns: 'đèn lồng giấy',
}

/** Click the hub's "Ask about the concert" button for a component giver. */
async function askConcert(page, giver) {
  await meet(page, giver)
  await page
    .getByRole('button', { name: 'Ask about the concert', exact: true })
    .click()
  await page.waitForFunction(
    (giver) =>
      window.__THREE_GAME_DIAGNOSTICS__?.state.quests?.some(
        (q) => q.giverNpcId === giver && q.milestone === 'evening-concert'
      ),
    giver,
    { timeout: 30000 }
  )
  const offered = (await diagnostics(page)).state.quests.find(
    (q) => q.giverNpcId === giver && q.milestone === 'evening-concert'
  )
  assert(offered, `${giver} offered its milestone errand`)
  await dismiss(page)
  return offered
}

/** Complete one base errand's steps, reading the live quest each step. */
async function runBase(page, offered) {
  for (const [index, step] of offered.steps.entries()) {
    if (step.type === 'GO_TO')
      await teleport(page, ...locations[step.locationId])
    else await meet(page, step.npcId)
    await page.waitForFunction(
      ([id, index]) =>
        window.__THREE_GAME_DIAGNOSTICS__?.state.quests?.find(
          (q) => q.id === id
        )?.progress[index],
      [offered.id, index],
      { timeout: 30000 }
    )
    await dismiss(page)
  }
  // Return to the giver to collect the component.
  const before = (await diagnostics(page)).state.completed
  await meet(page, offered.giverNpcId)
  await page.waitForFunction(
    (before) => window.__THREE_GAME_DIAGNOSTICS__?.state.completed > before,
    before,
    { timeout: 30000 }
  )
  await dismiss(page)
}

const browser = await chromium.launch({ headless: true, executablePath })
const out = process.env.QA_OUTPUT || 'artifacts/quest-milestone'
const results = []
await mkdir(out, { recursive: true })
try {
  for (const [locale, width] of [
    ['en-US', 1440],
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

    // 1-2. Ask each component giver and finish the three base errands.
    for (const giver of ['mai', 'thao', 'ba']) {
      const offered = await askConcert(page, giver)
      await runBase(page, offered)
    }
    // 3. Vy auto-offers the apex once all three components are held.
    await meet(page, 'vy')
    await page.waitForFunction(
      () =>
        window.__THREE_GAME_DIAGNOSTICS__?.state.quests?.some(
          (q) => q.giverNpcId === 'vy' && q.milestone === 'evening-concert'
        ),
      null,
      { timeout: 30000 }
    )
    const apex = (await diagnostics(page)).state.quests.find(
      (q) => q.giverNpcId === 'vy' && q.milestone === 'evening-concert'
    )
    assert(apex, 'Vy auto-offered the apex')
    assert.equal(apex.steps.length, 3, 'apex brings three components')

    // 4. Give three times at Vy (BRING consumes each component).
    const before = (await diagnostics(page)).state.completed
    for (const step of apex.steps) {
      await meet(page, 'vy')
      await page
        .getByRole('button', {
          name: `Give ${itemLabels[step.itemId]}`,
          exact: true,
        })
        .click()
      await page.waitForTimeout(500)
      await dismiss(page)
    }
    await meet(page, 'vy')
    await page.waitForFunction(
      (before) => window.__THREE_GAME_DIAGNOSTICS__?.state.completed > before,
      before,
      { timeout: 30000 }
    )

    // 5. The reward card, the concert event marker, and the headline appear.
    await page.waitForFunction(
      () => window.__THREE_GAME_DIAGNOSTICS__?.state.panel === 'reward'
    )
    await page.screenshot({ path: `${out}/reward-${locale}-${width}.png` })
    await dismiss(page)
    await page.waitForFunction(
      () => {
        const city = window.__THREE_GAME_DIAGNOSTICS__?.city
        return (
          city?.events?.some((event) => event.kind === 'street-music') &&
          city?.headlines?.some((h) => h.text.includes('evening concert')) &&
          city?.npcPlacements?.thao?.locationId === 'cityhall'
        )
      },
      null,
      { timeout: 30000 }
    )

    // 6. A second context in the same room sees the event and Thao at City Hall.
    const observer = await context.browser().newContext({
      locale,
      viewport: { width: 1440, height: 900 },
    })
    const other = await observer.newPage()
    await other.goto(gameUrl)
    await openGame(other)
    await other.waitForFunction(
      () => {
        const city = window.__THREE_GAME_DIAGNOSTICS__?.city
        return (
          city?.events?.some((event) => event.kind === 'street-music') &&
          city?.npcPlacements?.thao?.locationId === 'cityhall'
        )
      },
      null,
      { timeout: 45000 }
    )
    await observer.close()

    const snapshot = await diagnostics(page)
    results.push({ locale, width, apex, city: snapshot.city, errors })
    await writeFile(`${out}/milestone.json`, JSON.stringify(results, null, 2))
    assert.deepEqual(errors, [])
    await context.close()
  }
  await writeFile(`${out}/milestone.json`, JSON.stringify(results, null, 2))
} finally {
  await browser.close()
}

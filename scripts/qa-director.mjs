import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import {
  chromium,
  diagnostics,
  executablePath,
  openGame,
} from './qa-quest-flow.mjs'

const out = process.env.QA_OUTPUT || 'artifacts/city-director'
const browser = await chromium.launch({ headless: true, executablePath })
const contexts = []
const pages = []
const errors = []
await mkdir(out, { recursive: true })
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({
      locale: 'en-US',
      viewport: { width, height: width === 390 ? 844 : 900 },
      isMobile: width === 390,
      hasTouch: width === 390,
    })
    contexts.push(context)
    const page = await context.newPage()
    pages.push(page)
    page.on('pageerror', (error) => errors.push(error.message))
    await openGame(page)
    await page.waitForFunction(() => {
      const network = window.__THREE_GAME_DIAGNOSTICS__?.network
      return (
        network?.connection === 'connected' &&
        window.__THREE_GAME_DIAGNOSTICS__?.city
      )
    })
  }
  const initial = await Promise.all(pages.map(diagnostics))
  await writeFile(`${out}/initial.json`, JSON.stringify(initial, null, 2))
  assert.equal(
    initial[0].network.room,
    initial[1].network.room,
    'tourists share the same room'
  )
  for (const page of pages) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await page.waitForFunction(
          () => {
            const city = window.__THREE_GAME_DIAGNOSTICS__?.city
            return city?.events?.length && city.headlines?.length
          },
          null,
          { timeout: 55000 }
        )
        break
      } catch (error) {
        if (attempt === 1) throw error
        process.stdout.write(
          'Waiting for the next occupied-room director turn.\n'
        )
      }
    }
  }
  const first = await diagnostics(pages[0])
  await pages[1].waitForFunction(
    (snapshot) => {
      const city = window.__THREE_GAME_DIAGNOSTICS__?.city
      return (
        JSON.stringify(city?.npcPlacements) ===
          JSON.stringify(snapshot.npcPlacements) &&
        JSON.stringify(city?.events) === JSON.stringify(snapshot.events) &&
        city?.weather === snapshot.weather
      )
    },
    first.city,
    { timeout: 15000 }
  )
  const snapshots = await Promise.all(pages.map(diagnostics))
  assert.deepEqual(snapshots[0].city.events, snapshots[1].city.events)
  assert.deepEqual(
    snapshots[0].city.npcPlacements,
    snapshots[1].city.npcPlacements
  )
  assert.equal(snapshots[0].city.weather, snapshots[1].city.weather)
  assert(
    snapshots[0].city.events.length <= 2,
    'director respects the active event cap'
  )
  const moved = Object.entries(snapshots[0].city.npcPlacements).filter(
    ([npcId, placement]) => placement.anchorId !== npcId
  )
  assert(moved.length > 0, 'director moved an NPC to another authored anchor')
  for (const [npcId, placement] of moved) {
    assert.deepEqual(
      snapshots[1].city.npcPlacements[npcId],
      placement,
      'both clients observe the same NPC move'
    )
  }
  const ui = []
  for (const [index, page] of pages.entries()) {
    await page.bringToFront()
    await page
      .getByRole('button', { name: 'Open city hub', exact: true })
      .click()
    await page.getByText('City pulse', { exact: true }).waitFor()
    const text = await page.locator('dialog.hub-screen').innerText()
    assert(
      text.includes(snapshots[index].city.headlines.at(-1).text),
      'headline appears in the hub'
    )
    assert.equal(
      await page.evaluate(() => document.body.scrollWidth > innerWidth),
      false
    )
    await page.screenshot({
      path: `${out}/${index ? 'mobile' : 'desktop'}-city-pulse.png`,
    })
    ui.push(text)
  }
  assert.deepEqual(errors, [])
  await writeFile(
    `${out}/shared-city.json`,
    JSON.stringify({ initial, snapshots, moved, ui, errors }, null, 2)
  )
} catch (error) {
  await writeFile(
    `${out}/failure.json`,
    JSON.stringify(
      {
        error: String(error),
        pages: await Promise.all(
          pages.map(async (page) => ({
            text: await page.locator('body').innerText(),
            diagnostics: await diagnostics(page),
          }))
        ),
      },
      null,
      2
    )
  )
  throw error
} finally {
  await Promise.all(contexts.map((context) => context.close()))
  await browser.close()
}

import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import {
  chromium,
  completeQuest,
  diagnostics,
  executablePath,
  openGame,
} from './qa-quest-flow.mjs'

const browser = await chromium.launch({ headless: true, executablePath })
const out = process.env.QA_OUTPUT || 'artifacts/quest-multiplayer'
const contexts = []
const pages = []
const errors = []
await mkdir(out, { recursive: true })
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: width === 390 ? 844 : 900 },
      isMobile: width === 390,
      hasTouch: width === 390,
    })
    contexts.push(context)
    const page = await context.newPage()
    pages.push(page)
    page.on('pageerror', (error) => errors.push(error.message))
    await openGame(page)
  }
  const [desktop, mobile] = pages
  const states = await Promise.all(pages.map(diagnostics))
  for (const [index, page] of pages.entries()) {
    await page.bringToFront()
    await page
      .getByRole('button', { name: 'People nearby', exact: true })
      .click()
    await page
      .getByText(states[1 - index].network.guestName, { exact: true })
      .first()
      .waitFor()
    await page.getByRole('button', { name: 'Close panel', exact: true }).click()
  }
  await desktop
    .getByRole('button', { name: 'People nearby', exact: true })
    .click()
  await desktop
    .getByRole('button', {
      name: `Invite ${states[1].network.guestName}`,
      exact: true,
    })
    .click()
  await desktop
    .getByRole('button', { name: 'Close panel', exact: true })
    .click()
  await mobile
    .getByRole('button', { name: 'Accept invite', exact: true })
    .click()
  for (const page of pages) {
    await page.waitForFunction(
      () =>
        window.__THREE_GAME_DIAGNOSTICS__?.network.party?.members.length === 2
    )
  }
  await desktop.bringToFront()
  await desktop
    .getByRole('button', { name: 'Emotes and phrases', exact: true })
    .click()
  await desktop.getByRole('button', { name: 'Wave', exact: true }).click()
  await mobile.waitForFunction(() =>
    Boolean(window.__THREE_GAME_DIAGNOSTICS__?.network.emotes?.length)
  )
  const result = await completeQuest(desktop)
  assert.equal(
    (await diagnostics(mobile)).state.completed,
    0,
    'solo quest rewards stay with their owner'
  )
  for (const [index, page] of pages.entries()) {
    assert.equal(
      await page.evaluate(() => document.body.scrollWidth > innerWidth),
      false
    )
    await page.screenshot({
      path: `${out}/${index ? 'mobile' : 'desktop'}.png`,
    })
  }
  assert.deepEqual(errors, [])
  await writeFile(
    `${out}/flow.json`,
    JSON.stringify(
      {
        states,
        quest: result,
        final: await Promise.all(pages.map(diagnostics)),
        errors,
      },
      null,
      2
    )
  )
} finally {
  await Promise.all(contexts.map((context) => context.close()))
  await browser.close()
}

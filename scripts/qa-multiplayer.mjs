import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import {
  activate,
  chromium,
  diagnostics,
  executablePath,
  followQuest,
  meet,
  offerQuest,
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
  }
  const [desktop, mobile] = pages
  for (const page of pages) {
    await activate(page)
    await page.waitForFunction(
      () => window.__THREE_GAME_DIAGNOSTICS__?.network.playerCount >= 2
    )
  }
  const states = await Promise.all(pages.map(diagnostics))
  for (const [index, page] of pages.entries()) {
    await activate(page)
    await page
      .getByRole('button', { name: 'People nearby', exact: true })
      .click()
    await page
      .getByText(states[1 - index].network.guestName, { exact: true })
      .first()
      .waitFor()
    await page.getByRole('button', { name: 'Close panel', exact: true }).click()
  }
  await activate(desktop)
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
  await activate(mobile)
  await mobile
    .getByRole('button', { name: 'Accept invite', exact: true })
    .click()
  for (const page of pages) {
    await activate(page)
    await page.waitForFunction(
      () =>
        window.__THREE_GAME_DIAGNOSTICS__?.network.party?.members.length === 2
    )
  }
  await activate(desktop)
  await desktop
    .getByRole('button', { name: 'Emotes and phrases', exact: true })
    .click()
  await desktop.getByRole('button', { name: 'Wave', exact: true }).click()
  await activate(mobile)
  await mobile.waitForFunction(() =>
    Boolean(window.__THREE_GAME_DIAGNOSTICS__?.network.emotes?.length)
  )
  const offered = await offerQuest(desktop)
  assert.equal(offered.scope, 'party', 'party speaker receives a shared quest')
  for (const page of pages) {
    await activate(page)
    await page.waitForFunction(
      (id) =>
        window.__THREE_GAME_DIAGNOSTICS__?.state.quests.some(
          (quest) => quest.id === id
        ),
      offered.id
    )
  }
  const before = await Promise.all(pages.map(diagnostics))
  await followQuest(desktop, offered)
  assert.equal(
    (await diagnostics(mobile)).state.completed,
    0,
    'first member readiness cannot grant team rewards'
  )
  await followQuest(mobile, offered)
  await activate(desktop)
  await meet(desktop, offered.giverNpcId)
  await desktop.getByRole('button', { name: "I'm back", exact: true }).click()
  for (const [index, page] of pages.entries()) {
    await activate(page)
    await page.waitForFunction(
      (count) =>
        window.__THREE_GAME_DIAGNOSTICS__?.state.completed === count + 1,
      before[index].state.completed
    )
    const rewarded = await diagnostics(page)
    assert.equal(
      rewarded.state.currency,
      before[index].state.currency +
        offered.reward.currency -
        offered.steps.reduce(
          (total, step) =>
            total +
            (step.type === 'BUY'
              ? step.marketItemId === 'coffee'
                ? 3
                : 2
              : 0),
          0
        )
    )
    await page
      .getByText(`+${offered.reward.currency} coins`, { exact: true })
      .first()
      .waitFor()
  }
  const result = {
    offered,
    before,
    rewarded: await Promise.all(pages.map(diagnostics)),
  }
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
} catch (error) {
  await writeFile(
    `${out}/failure.json`,
    JSON.stringify(
      {
        error: String(error),
        pages: await Promise.all(
          pages.map(async (page) => ({
            diagnostics: await diagnostics(page),
            text: await page.locator('body').innerText(),
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

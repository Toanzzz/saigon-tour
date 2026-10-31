import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'

const require = createRequire('/private/tmp/saigon-tour-qa/package.json')
const { chromium } = require('playwright')
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROMIUM_PATH ||
    '/Users/toan/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  args: ['--enable-webgl'],
})
const errors = []
const contexts = []
const pages = []
let coopEvidence = null
const base = process.env.API_URL || 'http://127.0.0.1:58004'
const url = process.env.GAME_URL || 'http://127.0.0.1:58003/?debug=1'
const out = process.env.QA_OUTPUT || 'artifacts/pass-multiplayer'
const guest = async (page) => {
  const token = await page.evaluate(() =>
    localStorage.getItem('saigon-tour.session-token')
  )
  return (
    await (
      await fetch(`${base}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).json()
  ).player
}
const open = async (width) => {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    isMobile: width === 390,
    hasTouch: width === 390,
  })
  contexts.push(context)
  const page = await context.newPage()
  pages.push(page)
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto(url)
  await page.waitForFunction(
    () => window.__THREE_GAME_DIAGNOSTICS__?.state.frame > 30
  )
  await page
    .getByRole('button', { name: 'Start exploring', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'People nearby', exact: true })
    .waitFor()
  return page
}
try {
  const desktop = await open(1440)
  const mobile = await open(390)
  const guests = await Promise.all(pages.map(guest))
  for (const [index, page] of pages.entries()) {
    await page.bringToFront()
    await page
      .getByRole('button', { name: 'People nearby', exact: true })
      .click()
    await page
      .getByText(guests[1 - index].name, { exact: true })
      .first()
      .waitFor()
    await page.keyboard.press('Escape')
  }
  await desktop.bringToFront()
  await desktop
    .getByRole('button', { name: 'Emotes and phrases', exact: true })
    .click()
  await desktop.getByRole('button', { name: 'Wave', exact: true }).click()
  await mobile.waitForFunction(() =>
    Boolean(window.__THREE_GAME_DIAGNOSTICS__?.network?.emotes?.length)
  )
  assert.equal(
    await mobile.evaluate(() => document.body.scrollWidth > innerWidth),
    false
  )

  if (process.env.QA_COOP === '1') {
    const activate = async (page) => {
      await page.bringToFront()
      const screen = await page.evaluate(
        () => window.__THREE_GAME_DIAGNOSTICS__?.state.screen
      )
      if (screen === 'paused')
        await page
          .getByRole('button', { name: 'Continue exploring', exact: true })
          .click()
    }
    const meet = async (page, x, z) => {
      await activate(page)
      await page.evaluate(
        ([x, z]) => window.__THREE_GAME_TEST_HOOKS__.teleport(x, z),
        [x, z]
      )
      await page.waitForFunction(
        ([x, z]) => {
          const position = window.__THREE_GAME_DIAGNOSTICS__?.state.position
          return (
            position &&
            Math.abs(position[0] - x) < 1 &&
            Math.abs(position[2] - z) < 1
          )
        },
        [x, z]
      )
      await page.waitForTimeout(250)
      if (await page.locator('button.touch-interact:visible').count())
        await page.locator('button.touch-interact').click()
      else await page.keyboard.press('e')
      await page.locator('dialog.conversation').waitFor()
    }
    await activate(desktop)
    await desktop
      .getByRole('button', { name: 'People nearby', exact: true })
      .click()
    await desktop
      .getByRole('button', { name: `Invite ${guests[1].name}`, exact: true })
      .click()
    await desktop.keyboard.press('Escape')
    await activate(mobile)
    await mobile
      .getByRole('button', { name: 'Accept invite', exact: true })
      .click()
    await mobile.waitForFunction(
      () =>
        window.__THREE_GAME_DIAGNOSTICS__?.network?.party?.members.length === 2
    )
    await meet(desktop, -23, 5.5)
    await desktop
      .getByRole('button', { name: 'Team errand', exact: true })
      .click()
    await desktop.waitForFunction(
      () =>
        window.__THREE_GAME_DIAGNOSTICS__?.network?.party?.quest?.assignments
          .length === 2
    )
    await desktop
      .getByRole('button', { name: 'Close panel', exact: true })
      .click()
    for (const page of pages) {
      await meet(page, 24, -3)
      await page
        .getByRole('button', {
          name: /Deliver the (noodles|broth|baguette|coffee)/,
        })
        .click()
      await page.waitForFunction(() => {
        const net = window.__THREE_GAME_DIAGNOSTICS__?.network
        return net?.party?.quest?.assignments.some(
          (a) => a.playerId === net.selfId && a.delivered
        )
      })
      await page
        .getByRole('button', { name: 'Close panel', exact: true })
        .click()
    }
    await meet(desktop, -23, 5.5)
    await desktop
      .getByRole('button', { name: 'Check team errand', exact: true })
      .click()
    for (const page of pages) {
      await page.waitForFunction(
        () => window.__THREE_GAME_DIAGNOSTICS__?.state.currency === 70
      )
      await page.getByText('+40 coins', { exact: true }).first().waitFor()
    }
    const rewarded = await Promise.all(pages.map(guest))
    coopEvidence = {
      rewarded,
      beforeReload: await Promise.all(
        pages.map((page) =>
          page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__)
        )
      ),
    }
    await mkdir(out, { recursive: true })
    for (const [index, page] of pages.entries())
      await page.screenshot({ path: `${out}/reward-${index}.png` })
    for (const player of rewarded) {
      assert.equal(player.world.currency, 70)
      assert.equal(player.reputation, 2)
      assert.equal(player.world.inventory.photo, 1)
      assert(player.world.completedQuestIds.includes('hoa-team-lunch'))
    }
    for (const [index, page] of pages.entries()) {
      await page.reload()
      await page.getByText(`Welcome back, ${guests[index].name}`).waitFor()
      assert.equal((await guest(page)).world.currency, 70)
      await page.waitForFunction(
        () => window.__THREE_GAME_DIAGNOSTICS__?.state.frame > 30
      )
    }
  }
  for (const page of pages) {
    const headerFits = await page
      .locator('.game-header')
      .evaluateAll((headers) =>
        headers.every(
          (header) => header.getBoundingClientRect().right <= innerWidth
        )
      )
    assert(headerFits, 'header fits the viewport')
  }
  await mkdir(out, { recursive: true })
  const diagnostics = await Promise.all(
    pages.map((p) => p.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__))
  )
  for (const [i, page] of pages.entries())
    await page.screenshot({ path: `${out}/${i ? 'mobile' : 'desktop'}.png` })
  assert.deepEqual(errors, [])
  await writeFile(
    `${out}/flow.json`,
    JSON.stringify(
      {
        guests: guests.map((g) => ({
          id: g.id,
          name: g.name,
          coins: g.world.currency,
        })),
        diagnostics,
        coopEvidence,
        errors,
      },
      null,
      2
    )
  )
} catch (error) {
  await mkdir(out, { recursive: true })
  await writeFile(
    `${out}/failure.json`,
    JSON.stringify(
      await Promise.all(
        pages.map(async (page) => ({
          text: await page.locator('body').innerText(),
          diagnostics: await page.evaluate(
            () => window.__THREE_GAME_DIAGNOSTICS__
          ),
        }))
      ),
      null,
      2
    )
  )
  throw error
} finally {
  await Promise.all(contexts.map((context) => context.close()))
  await browser.close()
}

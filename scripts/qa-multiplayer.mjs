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
const base = process.env.API_URL || 'http://127.0.0.1:58004'
const url = process.env.GAME_URL || 'http://127.0.0.1:58003/?debug=1'
const out = process.env.QA_OUTPUT || 'artifacts/pass-multiplayer'
const guest = async (page) => {
  const token = await page.evaluate(() =>
    localStorage.getItem('saigon-tour.guest-token')
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

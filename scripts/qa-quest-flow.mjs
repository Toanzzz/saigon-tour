import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(
  `${process.env.QA_MODULE_ROOT || '/private/tmp/saigon-tour-qa'}/package.json`
)
export const { chromium } = require('playwright')
export const executablePath =
  process.env.CHROMIUM_PATH ||
  '/Users/toan/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
export const gameUrl = process.env.GAME_URL || 'http://127.0.0.1:58000/?debug=1'
export const diagnostics = (page) =>
  page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__)

const anchors = {
  hoa: [-23, 3.5],
  tam: [-12, 10],
  linh: [24, -5],
  ba: [23, 29],
  mai: [-30, 18],
  alex: [92, -38],
  vy: [64, -18],
  son: [103, -78],
  thao: [94, -31],
}
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
export async function dismiss(page) {
  const button = page.getByRole('button', { name: 'Close panel', exact: true })
  if (await button.isVisible()) await button.click()
}
export async function teleport(page, x, z) {
  await dismiss(page)
  await page.evaluate(
    ([x, z]) => window.__THREE_GAME_TEST_HOOKS__.teleport(x, z),
    [x, z]
  )
  await page.waitForFunction(
    ([x, z]) => {
      const at = window.__THREE_GAME_DIAGNOSTICS__?.state.position
      return at && Math.abs(at[0] - x) < 0.6 && Math.abs(at[2] - z) < 0.6
    },
    [x, z]
  )
  await page.waitForTimeout(300)
}
export async function meet(page, npcId) {
  const [x, z] = anchors[npcId]
  await teleport(page, x, z + 2)
  const touch = page.locator('button.touch-interact')
  if (await touch.isVisible()) await touch.click()
  else await page.keyboard.press('e')
  await page.locator('dialog.conversation').waitFor()
  await page.locator('.thinking').waitFor({ state: 'detached', timeout: 30000 })
}
export async function openGame(page) {
  await page.goto(gameUrl)
  await page
    .getByRole('button', { name: 'Start exploring', exact: true })
    .click({ timeout: 45000 })
  await page.waitForFunction(
    () => window.__THREE_GAME_DIAGNOSTICS__?.state.frame > 30
  )
}
export async function completeQuest(page, giver = 'hoa') {
  await meet(page, giver)
  await page.getByRole('button', { name: 'Any errands?', exact: true }).click()
  await page.waitForFunction(
    (giver) =>
      window.__THREE_GAME_DIAGNOSTICS__?.state.quests?.some(
        (q) => q.giverNpcId === giver
      ),
    giver,
    { timeout: 30000 }
  )
  const offered = (await diagnostics(page)).state.quests.find(
    (q) => q.giverNpcId === giver
  )
  assert(offered.id.startsWith('q_'))
  for (const [index, step] of offered.steps.entries()) {
    if (step.type === 'GO_TO') {
      await teleport(page, ...locations[step.locationId])
    } else if (step.type === 'BUY') {
      await teleport(page, ...locations.market)
      await page
        .getByRole('button', { name: 'Browse market goods', exact: true })
        .click()
      await page
        .getByRole('button', {
          name: new RegExp(
            step.marketItemId === 'coffee' ? 'Cà phê sữa' : 'Chuối chín'
          ),
        })
        .click()
    } else {
      await meet(page, step.npcId)
      if (step.type === 'DELIVER')
        await page
          .getByRole('button', { name: `Give ${step.itemId}`, exact: true })
          .click()
    }
    await page.waitForFunction(
      ([id, index]) =>
        window.__THREE_GAME_DIAGNOSTICS__?.state.quests?.find(
          (q) => q.id === id
        )?.progress[index],
      [offered.id, index],
      { timeout: 30000 }
    )
  }
  await meet(page, giver)
  const before = (await diagnostics(page)).state.currency
  const completed = (await diagnostics(page)).state.completed
  await page.getByRole('button', { name: "I'm back", exact: true }).click()
  await page.waitForFunction(
    (completed) =>
      window.__THREE_GAME_DIAGNOSTICS__?.state.completed > completed,
    completed,
    { timeout: 30000 }
  )
  const rewarded = await diagnostics(page)
  assert.equal(rewarded.state.currency, before + offered.reward.currency)
  assert.equal(rewarded.state.completed, completed + 1)
  return { offered, rewarded }
}

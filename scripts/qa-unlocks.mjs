import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import sharp from 'sharp'
import {
  chromium,
  completeQuest,
  diagnostics,
  enterPlay,
  executablePath,
  gameUrl,
  openGame,
} from './qa-quest-flow.mjs'

const browser = await chromium.launch({ headless: true, executablePath })
const out = process.env.QA_OUTPUT || 'artifacts/unlocks'
await mkdir(out, { recursive: true })
const results = []

try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({
      locale: 'en-US',
      viewport: { width, height: 900 },
      isMobile: width === 390,
      hasTouch: width === 390,
    })
    const page = await context.newPage()
    const errors = []
    const observerContext = await browser.newContext({
      locale: 'en-US',
      viewport: { width: 1000, height: 800 },
    })
    const observer = await observerContext.newPage()
    observer.on('pageerror', (error) => errors.push(error.message))
    await openGame(observer)
    page.on('pageerror', (error) => {
      errors.push(error.message)
      console.log('PAGEERROR', error.message)
    })
    if (width === 390) {
      await page.goto(gameUrl)
      await page.getByRole('button', { name: /^Switch character look/ }).click()
      await enterPlay(page)
    } else await openGame(page)

    // Complete hoa's seed errand; the neutral-tier reward is an unlock.
    const { offered } = await completeQuest(page, 'hoa')
    const unlockId = offered.reward.unlockId
    assert(
      unlockId,
      'seed quest reward should include an unlock at neutral tier'
    )

    // The reward popup opens and names the unlock.
    await page.waitForFunction(
      () => window.__THREE_GAME_DIAGNOSTICS__?.state.panel === 'reward',
      null,
      { timeout: 10000 }
    )
    const rewardText = await page.locator('.reward-dialog').innerText()
    assert(/unlocked/i.test(rewardText), 'reward popup should show the unlock')
    await page.screenshot({ path: `${out}/reward-${width}.png` })

    // The unlock is owned.
    let state = (await diagnostics(page)).state
    assert(
      state.unlocks.owned.includes(unlockId),
      'completed quest should grant the unlock'
    )

    // An equip failure keeps the receipt available for a real retry.
    await page.route('**/me/equip', (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: '{"error":"qa_unavailable"}',
      })
    )
    await page.getByRole('button', { name: 'Wear now', exact: true }).click()
    await page
      .getByRole('alert')
      .filter({ hasText: 'Could not equip this reward' })
      .waitFor()
    assert(await page.locator('.reward-dialog').isVisible())
    await page.unroute('**/me/equip')
    // "Wear now" equips the reward straight from the popup and closes it.
    await page.getByRole('button', { name: 'Wear now' }).click()
    await page.waitForFunction(
      (id) =>
        Object.values(
          window.__THREE_GAME_DIAGNOSTICS__?.state.unlocks.equipped ?? {}
        ).includes(id),
      unlockId,
      { timeout: 10000 }
    )
    state = (await diagnostics(page)).state
    assert(
      Object.values(state.unlocks.equipped).includes(unlockId),
      'Wear now should equip the reward'
    )

    // A completed errand can surface the city hub; close it first.
    const closeHub = page.getByRole('button', { name: 'Close city hub' })
    if (await closeHub.isVisible().catch(() => false)) {
      await closeHub.click()
      await page.waitForFunction(
        () => window.__THREE_GAME_DIAGNOSTICS__?.state.screen === 'playing'
      )
    }

    // Open the wardrobe. Assert a canvas is mounted inside the dialog.
    await page.getByRole('button', { name: 'Open wardrobe' }).first().click()
    await page.waitForFunction(
      () => window.__THREE_GAME_DIAGNOSTICS__?.state.panel === 'wardrobe'
    )
    await page.waitForSelector('.wardrobe-dialog canvas', { timeout: 10000 })
    await page.locator('.wardrobe-preview-loading').waitFor({ state: 'hidden' })
    await page.waitForTimeout(700)
    const stagePixels = await sharp(
      await page.locator('.wardrobe-dialog canvas').screenshot()
    ).stats()
    assert(
      stagePixels.channels.slice(0, 3).some((channel) => channel.stdev > 8),
      'the live fitting preview contains the rendered avatar'
    )
    await page.screenshot({ path: `${out}/wardrobe-${width}.png` })

    // The owned, equipped card shows an Unequip toggle. Clicking it clears the slot.
    const equippedCard = page.locator('.wardrobe-card.is-equipped').first()
    await equippedCard.getByRole('button', { name: 'Unequip' }).click()
    await page.waitForFunction(
      (id) =>
        !Object.values(
          window.__THREE_GAME_DIAGNOSTICS__?.state.unlocks.equipped ?? {}
        ).includes(id),
      unlockId,
      { timeout: 10000 }
    )
    // Re-equip from the card.
    await page
      .locator('.wardrobe-card')
      .filter({ hasText: /Equip/ })
      .first()
      .getByRole('button', { name: 'Equip', exact: true })
      .click()
    await page.waitForFunction(
      (id) =>
        Object.values(
          window.__THREE_GAME_DIAGNOSTICS__?.state.unlocks.equipped ?? {}
        ).includes(id),
      unlockId,
      { timeout: 10000 }
    )

    // A fresh load restores the server-owned equipment and body.
    await page.reload()
    await enterPlay(page)
    await page.waitForFunction(
      (id) =>
        window.__THREE_GAME_DIAGNOSTICS__?.state.unlocks.equipped.hat === id,
      unlockId
    )
    state = (await diagnostics(page)).state
    assert(
      Object.values(state.unlocks.equipped).includes(unlockId),
      'equip should persist to state'
    )
    assert.equal(
      state.body,
      width === 390 ? 'woman' : 'man',
      'chosen body persists'
    )
    await page.waitForFunction(() =>
      Boolean(window.__THREE_GAME_DIAGNOSTICS__?.network.selfId)
    )
    const selfId = (await diagnostics(page)).network.selfId
    await observer.bringToFront()
    await observer.waitForFunction(
      async ({ id, hat, body }) => {
        const source = performance
          .getEntriesByType('resource')
          .map((entry) => entry.name)
          .find(
            (url) => new URL(url).pathname === '/src/shared/api/presence.ts'
          )
        const { presence } = await import(source)
        const remote = presence.get(id)?.samples.at(-1)?.player
        return remote?.look?.hat === hat && remote.body === body
      },
      { id: selfId, hat: unlockId, body: state.body },
      { timeout: 30000 }
    )

    results.push({
      width,
      unlockId,
      equipped: state.unlocks.equipped,
      body: state.body,
      remoteAppearance: true,
      livePreview: true,
      errors,
    })
    assert.equal(errors.length, 0, `no page errors at ${width}px`)
    await observerContext.close()
    await context.close()
  }
  await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2))
  console.log('UNLOCKS_QA_OK', JSON.stringify(results))
} finally {
  await browser.close()
}

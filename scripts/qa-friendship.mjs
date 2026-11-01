import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import {
  chromium,
  dismiss,
  executablePath,
  openGame,
  teleport,
} from './qa-quest-flow.mjs'

const browser = await chromium.launch({ headless: true, executablePath })
const results = []
const out = process.env.QA_OUTPUT || 'artifacts/npc-friendship'
await mkdir(out, { recursive: true })
const moduleValue = async (page, path, expression, arg) =>
  page.evaluate(
    async ({ path, expression, arg }) => {
      const loaded = performance
        .getEntriesByType('resource')
        .map((r) => r.name)
        .filter((name) => name.includes(`/src/${path}`))
        .at(-1)
      const mod = await import(loaded ?? `/src/${path}`)
      return Function('mod', 'arg', expression)(mod, arg)
    },
    { path, expression, arg }
  )
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
    page.on('pageerror', (error) => {
      errors.push(error.message)
      console.log('PAGEERROR', error.message)
    })
    await openGame(page)
    await context.route('**/*', (route) =>
      new URL(route.request().url()).pathname.startsWith('/api/')
        ? route.abort()
        : route.continue()
    )
    await moduleValue(
      page,
      'shared/state/game.ts',
      "mod.update({guestStatus:'offline'}); return true"
    )
    // A walker: approach its live pose, then use the real interaction control.
    await teleport(page, -17, 7)
    const pose = await moduleValue(
      page,
      'shared/world/npc-pose.ts',
      "return mod.npcPoses.get('market-walk')"
    )
    await teleport(page, pose[0], pose[2] + 2)
    const before = await moduleValue(
      page,
      'shared/world/npc-pose.ts',
      "return mod.npcPoses.get('market-walk')"
    )
    await page.waitForTimeout(350)
    const after = await moduleValue(
      page,
      'shared/world/npc-pose.ts',
      "return mod.npcPoses.get('market-walk')"
    )
    assert(
      Math.hypot(before[0] - after[0], before[2] - after[2]) < 0.02,
      'walker pauses nearby'
    )
    const touch = page.locator('button.touch-interact')
    if (await touch.isVisible()) await touch.click()
    else await page.keyboard.press('e')
    await page.locator('dialog.conversation').waitFor()
    await page
      .locator('.thinking')
      .waitFor({ state: 'detached', timeout: 45000 })
    assert.match(await page.locator('dialog.conversation').innerText(), /Đạt/)
    assert.equal(
      await page.getByRole('meter').getAttribute('aria-valuenow'),
      '0'
    )
    await page.getByLabel('Your message', { exact: true }).fill('Any errands?')
    await page
      .getByRole('button', { name: 'Send message', exact: true })
      .click()
    await page
      .locator('.thinking')
      .waitFor({ state: 'detached', timeout: 45000 })
    const quest = await moduleValue(
      page,
      'shared/state/game.ts',
      'return mod.game.state.quests[0]'
    )
    assert.equal(quest.giverNpcId, 'market-walk')
    assert.equal(
      await page
        .getByRole('button', { name: 'Ask for an errand', exact: true })
        .count(),
      0
    )
    await dismiss(page)
    // Resident's seed asks for a real conversation with Linh.
    await teleport(page, 24, -3)
    if (await touch.isVisible()) await touch.click()
    else await page.keyboard.press('e')
    await page.locator('dialog.conversation').waitFor()
    await page
      .locator('.thinking')
      .waitFor({ state: 'detached', timeout: 45000 })
    await dismiss(page)
    const returnPose = await moduleValue(
      page,
      'shared/world/npc-pose.ts',
      "return mod.npcPoses.get('market-walk')"
    )
    await teleport(page, returnPose[0], returnPose[2] + 2)
    if (await touch.isVisible()) await touch.click()
    else await page.keyboard.press('e')
    assert.equal(
      await moduleValue(
        page,
        'shared/state/game.ts',
        'return mod.game.state.panel'
      ),
      'reward'
    )
    const friendship = await moduleValue(
      page,
      'shared/state/game.ts',
      "return mod.game.state.friendship['market-walk'].level"
    )
    assert.equal(friendship, 1)
    await dismiss(page)
    // Dismiss optional neighborhood hub.
    if (
      await page
        .getByRole('button', {
          name: /Back to the street|Keep exploring|Explore on foot/,
        })
        .count()
    )
      await page
        .getByRole('button', {
          name: /Back to the street|Keep exploring|Explore on foot/,
        })
        .first()
        .click()
    await moduleValue(
      page,
      'shared/state/game.ts',
      "mod.update({screen:'playing',hubShown:true}); return true"
    )
    const now = await moduleValue(
      page,
      'shared/world/npc-pose.ts',
      "return mod.npcPoses.get('market-walk')"
    )
    await teleport(page, now[0], now[2] + 2)
    if (await touch.isVisible()) await touch.click()
    else await page.keyboard.press('e')
    await page.locator('dialog.conversation').waitFor()
    await page
      .locator('.thinking')
      .waitFor({ state: 'detached', timeout: 45000 })
    assert.equal(
      await page.getByRole('meter').getAttribute('aria-valuenow'),
      '1'
    )
    assert.match(
      await page.locator('.conversation-history').innerText(),
      /Any errands\?/
    )
    await page.screenshot({ path: `${out}/resident-${width}.png` })
    await page.getByLabel('Your message', { exact: true }).fill('Any errands?')
    await page
      .getByRole('button', { name: 'Send message', exact: true })
      .click()
    await page
      .locator('.thinking')
      .waitFor({ state: 'detached', timeout: 45000 })
    await dismiss(page)
    await moduleValue(
      page,
      'shared/state/game.ts',
      "mod.update({panel:'journal'}); return true"
    )
    await page
      .getByRole('button', { name: 'Abandon errand', exact: true })
      .click()
    await page
      .waitForFunction(
        () =>
          document
            .querySelector('dialog')
            ?.textContent?.includes('No errands') ||
          !document.querySelector('button[aria-label="Abandon errand"]'),
        null,
        { timeout: 2000 }
      )
      .catch(() => {})
    assert.equal(
      await moduleValue(
        page,
        'shared/state/game.ts',
        "return mod.game.state.friendship['market-walk'].level"
      ),
      0
    )
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth
      ),
      false
    )
    // Persisted local history survives reload; journey reset removes it.
    await page.waitForTimeout(300)
    await page.reload()
    await page.waitForFunction(
      () => window.__THREE_GAME_DIAGNOSTICS__?.state.frame > 10
    )
    assert(
      (
        await moduleValue(
          page,
          'shared/api/history.ts',
          "return mod.cachedHistory('market-walk')"
        )
      ).some((line) => line.content === 'Any errands?')
    )
    await context.unrouteAll()
    await moduleValue(
      page,
      'app/actions.ts',
      'return mod.restart().then(() => true)'
    )
    assert.equal(
      (
        await moduleValue(
          page,
          'shared/api/history.ts',
          "return mod.cachedHistory('market-walk')"
        )
      ).length,
      0
    )
    await moduleValue(
      page,
      'shared/state/game.ts',
      "mod.update({screen:'playing', reducedMotion:true, hubShown:true}); return true"
    )
    const reducedPose = await moduleValue(
      page,
      'shared/world/npc-pose.ts',
      "return mod.npcPoses.get('market-walk')"
    )
    await teleport(page, reducedPose[0], reducedPose[2] + 2)
    await moduleValue(
      page,
      'shared/state/friendship.ts',
      "mod.noteFriendship({}, {'market-walk':{level:1}}); return true"
    )
    const pulse = page.locator('.friendship-pulse.still')
    await pulse.waitFor()
    assert.equal(
      await pulse.evaluate(
        (element) => getComputedStyle(element).animationName
      ),
      'friendship-fade'
    )
    assert.deepEqual(errors, [])
    results.push({
      width,
      walkerPaused: true,
      chatOffer: true,
      autoCompleted: true,
      friendship,
      abandonPenalty: true,
      historyReopened: true,
      historyReloaded: true,
      resetCleared: true,
      reducedMotion: true,
    })
    await context.close()
  }
  await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
} finally {
  await browser.close()
}

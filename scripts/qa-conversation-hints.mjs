import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import {
  chromium,
  executablePath,
  openGame,
  teleport,
} from './qa-quest-flow.mjs'

const out = process.env.QA_OUTPUT || 'artifacts/conversation-hints'
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ headless: true, executablePath })
const results = []

// Import the app's loaded module instance, including Vite's HMR timestamp.
async function state(page, kind) {
  return page.evaluate(async (kind) => {
    const load = (path) => {
      const loaded = performance
        .getEntriesByType('resource')
        .map((entry) => entry.name)
        .filter((name) => new URL(name).pathname === `/src/${path}`)
        .at(-1)
      return import(loaded ?? `/src/${path}`)
    }
    const { game, update } = await load('shared/state/game.ts')
    const { city, npcPosition } = await load('shared/api/city.ts')
    if (kind === 'prepare') {
      const { queryClient } = await load('shared/api/query.ts')
      queryClient.removeQueries({ queryKey: ['npc-history', 'commuter'] })
      update({
        quests: [],
        friendship: { ...game.state.friendship, commuter: { level: 0 } },
      })
      city.setState((s) => ({ ...s, npcActivities: {} }))
    } else if (kind === 'busy') {
      city.setState((s) => ({
        ...s,
        // Keep server snapshots from replacing this synthetic activity fixture.
        revision: s.revision + 1_000_000,
        npcActivities: {
          ...s.npcActivities,
          commuter: {
            activityId: 'busy',
            startedAt: Date.now() - 1000,
            endsAt: Date.now() + 60000,
          },
        },
      }))
    } else if (kind === 'unrelated') {
      update({ toast: 'Unrelated state update' })
    } else if (kind === 'cold') {
      update({
        serverRevision: game.state.serverRevision + 1_000_000,
        friendship: { commuter: { level: -4 } },
      })
    } else if (kind === 'full') {
      update({
        serverRevision: game.state.serverRevision + 1_000_000,
        friendship: { commuter: { level: 0 } },
        quests: [0, 1, 2].map((id) => ({
          id: `q_hint_${id}`,
          giverNpcId: 'hoa',
          title: `Market favor ${id}`,
          description: 'Visit the park.',
          steps: [{ type: 'GO_TO', locationId: 'park' }],
          scope: 'solo',
          reward: { currency: 25, reputation: 1, itemId: null },
          progress: [false],
          status: 'active',
          createdAt: Date.now(),
        })),
      })
    }
    const position = npcPosition('commuter')
    return { position, earlierCount: game.state.dialogue?.earlierCount ?? 0 }
  }, kind)
}

async function encounter(page) {
  const { position } = await state(page, 'position')
  await teleport(page, position[0], position[2] + 1)
  const touch = page.locator('button.touch-interact')
  if (await touch.isVisible()) await touch.click()
  else await page.keyboard.press('e')
  await page.locator('dialog.conversation').waitFor()
  await page.locator('.thinking').waitFor({ state: 'detached', timeout: 45000 })
}

async function close(page) {
  await page.locator('.conversation .dialog-heading button').click()
  await page.locator('dialog.conversation').waitFor({ state: 'detached' })
}

async function switchLanguage(page, locale) {
  await close(page)
  await page.keyboard.press('Escape')
  await page.locator('#game-language').selectOption(locale)
  await page
    .getByRole('button', {
      name: locale === 'vi' ? 'Tiếp tục khám phá' : 'Continue exploring',
      exact: true,
    })
    .click()
  await encounter(page)
}

try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({
      locale: 'en-US',
      viewport: { width, height: width === 390 ? 844 : 900 },
      isMobile: width === 390,
      hasTouch: width === 390,
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    let failedRequests = 0
    await page.route('**/npc/commuter/interact', (route) => {
      failedRequests++
      return route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: '{"error":"qa_unavailable"}',
      })
    })
    await openGame(page)
    await state(page, 'prepare')
    await encounter(page)
    const hint = page.locator('.conversation-hint')
    assert.equal(await hint.innerText(), 'Ask Tuan how the commute is going.')
    assert.match(
      await page.locator('.activity-scene p').innerText(),
      /walking along a familiar street/
    )
    await state(page, 'unrelated')
    assert.equal(await hint.innerText(), 'Ask Tuan how the commute is going.')
    await state(page, 'busy')
    assert.equal(await hint.innerText(), 'Ask Tuan how the commute is going.')
    await page.screenshot({ path: `${out}/first-${width}.png` })

    // Settings controls switch language; no player message means first copy.
    await switchLanguage(page, 'vi')
    assert.equal(
      await hint.innerText(),
      'Hỏi Tuấn có rảnh trò chuyện một lát không.'
    )
    assert.match(
      await page.locator('.activity-scene p').innerText(),
      /dừng chân/
    )
    await page.screenshot({ path: `${out}/vi-${width}.png` })
    await switchLanguage(page, 'en')
    assert.equal(
      await hint.innerText(),
      'Check whether Tuan has a moment to chat.'
    )
    const beforeSend = failedRequests
    await page.locator('#npc-message').fill('How is your day going?')
    await page
      .getByRole('button', { name: 'Send message', exact: true })
      .click()
    await page
      .locator('.thinking')
      .waitFor({ state: 'detached', timeout: 45000 })
    assert.equal(await hint.count(), 0)
    assert.match(
      await page.locator('.conversation-history').innerText(),
      /How is your day going/
    )
    assert.ok(failedRequests > beforeSend, 'send exercised the forced 503')
    await state(page, 'unrelated')
    assert.equal(await hint.count(), 0, 'failed send does not restore the hint')

    await close(page)
    await encounter(page)
    assert.equal(await hint.innerText(), 'Check in with Tuan during the pause.')
    assert.ok((await state(page, 'position')).earlierCount > 0)
    await state(page, 'cold')
    assert.match(await hint.innerText(), /gentle hello/)
    await state(page, 'full')
    assert.equal(await hint.innerText(), 'Check in with Tuan during the pause.')
    assert.match(await page.locator('.errand-full').innerText(), /Journal full/)
    await page.screenshot({ path: `${out}/returning-full-${width}.png` })
    assert.equal(
      await page.evaluate(() => document.body.scrollWidth > innerWidth),
      false
    )
    assert.deepEqual(errors, [])
    results.push({ width, failedRequests, pageErrors: errors, passed: true })
    console.log(`conversation hints passed: ${width}px`)
    await context.close()
  }
  await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2))
} finally {
  await browser.close()
}

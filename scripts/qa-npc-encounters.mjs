import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import {
  chromium,
  diagnostics,
  dismiss,
  enterPlay,
  executablePath,
  meet,
  openGame,
  teleport,
} from './qa-quest-flow.mjs'

const out = process.env.QA_OUTPUT || 'artifacts/npc-encounters'
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ headless: true, executablePath })
const results = []

// Use the loaded Vite module, including its HMR timestamp, to share app state.
async function moduleUrl(page, path) {
  return page.evaluate(
    (path) =>
      performance
        .getEntriesByType('resource')
        .map((entry) => entry.name)
        .filter((name) => new URL(name).pathname === path)
        .at(-1) ?? path,
    path
  )
}
async function assign(page, npc, activityId) {
  const url = await moduleUrl(page, '/src/shared/api/city.ts')
  await page.evaluate(
    async ({ url, npc, activityId }) => {
      const { city } = await import(url)
      city.setState((state) => ({
        ...state,
        // Keep this fixture stable while the live room continues sending patches.
        revision: state.revision + 10000,
        npcActivities: {
          ...state.npcActivities,
          [npc]: {
            activityId,
            startedAt: Date.now(),
            endsAt: Date.now() + 900000,
          },
        },
      }))
    },
    { url, npc, activityId }
  )
}
async function send(page, text, vi = false) {
  await page
    .getByLabel(vi ? 'Tin nhắn của bạn' : 'Your message', { exact: true })
    .fill(text)
  await page
    .getByRole('button', {
      name: vi ? 'Gửi tin nhắn' : 'Send message',
      exact: true,
    })
    .click()
  await page.locator('#npc-message:not([disabled])').waitFor({ timeout: 45000 })
}
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({
      locale: 'en-US',
      timezoneId: 'Asia/Ho_Chi_Minh',
      viewport: { width, height: width === 390 ? 844 : 900 },
      isMobile: width === 390,
      hasTouch: width === 390,
    })
    const page = await context.newPage()
    const errors = []
    const openings = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('response', async (response) => {
      if (response.url().includes('/npc/hoa/interact')) {
        const request = response.request().postDataJSON()
        if (request.intent === 'open')
          openings.push({
            status: response.status(),
            body: await response.text(),
          })
      }
    })
    await openGame(page)
    await page.waitForFunction(
      () =>
        window.__THREE_GAME_DIAGNOSTICS__?.network.connection === 'connected'
    )
    await meet(page, 'hoa')
    assert.equal(
      await page.locator('.speech').count(),
      0,
      'routine opening has no greeting bubble'
    )
    assert.match(
      await page.locator('.activity-scene').innerText(),
      /arranging bowls|holding a warm bowl/
    )
    assert.match(
      await page.locator('.encounter-divider').innerText(),
      /New encounter/
    )
    await send(page, 'Any errands?')
    assert.equal(await page.locator('.speech.user').count(), 1)
    assert.equal(await page.locator('.speech.assistant').count(), 1)
    const firstText = await page.locator('.speech.assistant p').innerText()
    assert.ok(firstText.length > 0)
    const time = await page
      .locator('.speech.user time')
      .getAttribute('datetime')
    assert.ok(Number.isFinite(Date.parse(time)))
    await dismiss(page)
    await meet(page, 'hoa')
    assert.equal(await page.locator('.speech.user').count(), 1)
    assert.equal(await page.locator('.speech.assistant').count(), 1)
    assert.equal(await page.locator('.history-toggle').count(), 0)
    assert.equal(
      await page.locator('.speech.assistant p').innerText(),
      firstText
    )
    assert.equal(
      await page.locator('.speech.user time').getAttribute('datetime'),
      time
    )
    const headingOverlap = await page.evaluate(() => {
      const portrait = document
        .querySelector('.affinity-portrait')
        .getBoundingClientRect()
      const heading = document
        .querySelector('.conversation .dialog-heading h2')
        .getBoundingClientRect()
      return heading.left < portrait.right
    })
    assert.equal(headingOverlap, false, 'NPC heading clears the portrait')
    await page.reload()
    await enterPlay(page)
    await page.waitForFunction(
      () =>
        window.__THREE_GAME_DIAGNOSTICS__?.network.connection === 'connected'
    )
    await meet(page, 'hoa')
    assert.equal(
      await page.locator('.speech.user time').getAttribute('datetime'),
      time
    )
    assert.equal(
      await page.locator('.speech.assistant p').innerText(),
      firstText
    )
    const capturedActivity = await page
      .locator('.activity-scene')
      .getAttribute('data-activity')
    const nextActivity = capturedActivity === 'default' ? 'busy' : 'default'
    const nextAnimation =
      nextActivity === 'busy' ? 'holding-both' : 'interact-right'
    await assign(page, 'hoa', nextActivity)
    await page.waitForFunction(
      (animation) =>
        window.__THREE_GAME_DIAGNOSTICS__?.npcAnimations.hoa?.clip ===
          animation &&
        window.__THREE_GAME_DIAGNOSTICS__?.npcAnimations.hoa?.time > 0,
      nextAnimation
    )
    await page.waitForFunction(
      (propExpected) =>
        window.__THREE_GAME_DIAGNOSTICS__?.npcAnimations.hoa?.props.includes(
          'food/bowl-soup'
        ) === propExpected,
      nextActivity === 'busy'
    )
    assert.equal(
      await page.locator('.activity-scene').getAttribute('data-activity'),
      capturedActivity
    )
    await dismiss(page)
    await meet(page, 'hoa')
    assert.equal(
      await page.locator('.activity-scene').getAttribute('data-activity'),
      nextActivity
    )
    await page.screenshot({ path: `${out}/encounter-${width}.png` })
    await dismiss(page)
    await page.getByRole('button', { name: 'Pause game', exact: true }).click()
    await page.getByLabel('Language / Ngôn ngữ').selectOption('vi')
    await page
      .getByRole('button', { name: 'Tiếp tục khám phá', exact: true })
      .click()
    await meet(page, 'hoa')
    assert.match(
      await page.locator('.encounter-divider').innerText(),
      /Lần gặp mới/
    )
    assert.match(
      await page.locator('.activity-scene').innerText(),
      /đang bưng bát|đang xếp bát/
    )
    assert.equal(
      await page.locator('.speech.user time').getAttribute('datetime'),
      time
    )
    // Force an outage through the real composer and check its local reply is saved.
    await page.route('**/npc/hoa/interact', (route) =>
      route.fulfill({ status: 503, body: '' })
    )
    await send(page, 'Cô có việc gì cần giúp không?', true)
    assert.equal(await page.locator('.speech.user').count(), 2)
    assert.equal(await page.locator('.speech.assistant').count(), 2)
    assert.equal(await page.locator('.speech time').count(), 4)
    await page.screenshot({ path: `${out}/vietnamese-offline-${width}.png` })
    await page.getByRole('button', { name: 'Đóng bảng', exact: true }).click()
    await page.unroute('**/npc/hoa/interact')
    await page.getByRole('button', { name: 'Tạm dừng', exact: true }).click()
    await page.getByLabel('Language / Ngôn ngữ').selectOption('en')
    await page
      .getByRole('button', { name: 'Continue exploring', exact: true })
      .click()
    // Populate recent history to exercise actual scrolling and an unknown legacy time.
    const queryUrl = await moduleUrl(page, '/src/shared/api/query.ts')
    await page.evaluate(async (url) => {
      const { queryClient } = await import(url)
      queryClient.setQueryData(['npc-history', 'hoa'], {
        messages: Array.from({ length: 30 }, (_, i) => ({
          id: `qa-${i}`,
          role: i % 2 ? 'assistant' : 'user',
          text: `Earlier line ${i}. ${'A neighborhood memory. '.repeat(5)}`,
          at: i ? new Date(Date.now() - (30 - i) * 60000).toISOString() : '',
        })),
      })
    }, queryUrl)
    await page.route('**/npc/hoa/history?*', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ messages: [] }),
      })
    )
    await meet(page, 'hoa')
    assert.equal(await page.locator('.speech').count(), 30)
    assert.match(
      await page.locator('.conversation-history').innerText(),
      /Earlier line/
    )
    assert.equal(
      await page
        .locator('.speech .message-time [aria-hidden]')
        .first()
        .innerText(),
      '—'
    )
    const log = page.locator('.conversation-history')
    await log.evaluate((el) => {
      el.scrollTop = 0
    })
    await page.waitForTimeout(100)
    await page.route('**/npc/hoa/interact', (route) =>
      route.fulfill({ status: 503, body: '' })
    )
    await send(page, 'Thanks for the help.')
    assert.equal(
      await log.evaluate((el) => el.scrollTop),
      0,
      'reading older messages suspends following'
    )
    await dismiss(page)
    await page.unroute('**/npc/hoa/interact')
    await page.unroute('**/npc/hoa/history?*')
    // Walking residents pause for the player and resume after the conversation.
    await assign(page, 'market-walk', 'default')
    await teleport(page, -17, 9)
    await page.waitForFunction(
      () =>
        window.__THREE_GAME_DIAGNOSTICS__?.npcAnimations['market-walk']
          ?.clip === 'walk'
    )
    const cityUrl = await moduleUrl(page, '/src/shared/api/city.ts')
    const residentAt = await page.evaluate(async (url) => {
      const { npcPosition } = await import(url)
      return npcPosition('market-walk')
    }, cityUrl)
    await teleport(page, residentAt[0], residentAt[2] + 1)
    if (width === 390) await page.locator('button.touch-interact').click()
    else await page.keyboard.press('e')
    await page.getByRole('heading', { name: 'Dat', exact: true }).waitFor()
    await page.waitForFunction(
      () =>
        window.__THREE_GAME_DIAGNOSTICS__?.npcAnimations['market-walk']
          ?.clip === 'idle'
    )
    await dismiss(page)
    await teleport(page, -17, 10)
    await page.waitForFunction(
      () =>
        window.__THREE_GAME_DIAGNOSTICS__?.npcAnimations['market-walk']
          ?.clip === 'walk'
    )
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth
      ),
      false
    )
    assert.deepEqual(errors, [])
    assert.ok(openings.length >= 3)
    assert.ok(
      openings.every(
        (response) =>
          response.status === 200 && response.body.includes('"reply":""')
      )
    )
    results.push({
      width,
      firstText,
      timestamp: time,
      openings: openings.length,
      npcBehaviors: (await diagnostics(page)).npcBehaviors,
      npcAnimations: (await diagnostics(page)).npcAnimations,
      errors,
    })
    await context.close()
    console.log(`NPC encounter flow passed: ${width}px`)
  }
  await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2))
} finally {
  await browser.close()
}

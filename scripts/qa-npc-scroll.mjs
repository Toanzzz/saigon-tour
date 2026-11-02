import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import {
  chromium,
  diagnostics,
  executablePath,
  meet,
  openGame,
} from './qa-quest-flow.mjs'

const out = process.env.QA_OUTPUT || 'artifacts/npc-scroll'
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ headless: true, executablePath })
const results = []
async function fixture(page) {
  await page.evaluate(async () => {
    const url = performance
      .getEntriesByType('resource')
      .map((entry) => entry.name)
      .filter((name) => new URL(name).pathname === '/src/shared/state/game.ts')
      .at(-1)
    const { game, update } = await import(url)
    const openedAt = new Date().toISOString()
    update({
      quests: Array.from({ length: 3 }, (_, i) => ({
        id: `q_scroll_${i}`,
        giverNpcId: 'hoa',
        title: `Neighborhood favor ${i + 1}`,
        description: 'Bring a warm bowl to a neighbor, then return.',
        steps: [{ type: 'GO_TO', locationId: 'alley' }],
        scope: 'solo',
        reward: { currency: 25, itemId: null, reputation: 1 },
        progress: [false],
        status: 'active',
        createdAt: Date.now(),
      })),
      dialogue: {
        ...game.state.dialogue,
        openedAt,
        earlierCount: 28,
        requestId: `scroll-${Date.now()}`,
        history: Array.from({ length: 28 }, (_, i) => ({
          id: `message-${i}`,
          role: i % 2 ? 'assistant' : 'user',
          content: `Earlier message ${i}. ${'A long neighborhood conversation. '.repeat(6)}`,
          at: new Date(Date.now() - (30 - i) * 60000).toISOString(),
        })),
        thinking: false,
      },
    })
  })
}
async function metrics(page) {
  return page.evaluate(() => {
    const dialog = document.querySelector('.conversation')
    const history = document.querySelector('.conversation-history')
    const heading = document.querySelector('.conversation .dialog-heading')
    const composer = document.querySelector('.conversation-input')
    const rect = (el) => {
      const r = el.getBoundingClientRect()
      return { top: r.top, bottom: r.bottom, height: r.height }
    }
    return {
      dialog: rect(dialog),
      heading: rect(heading),
      composer: rect(composer),
      dialogScrollTop: dialog.scrollTop,
      dialogScrollHeight: dialog.scrollHeight,
      dialogClientHeight: dialog.clientHeight,
      history: rect(history),
      historyScrollTop: history.scrollTop,
      historyClientHeight: history.clientHeight,
      historyScrollHeight: history.scrollHeight,
    }
  })
}
try {
  for (const [width, height] of [
    [1440, 900],
    [604, 627],
    [390, 844],
    [390, 600],
    [844, 390],
  ]) {
    const context = await browser.newContext({
      locale: 'en-US',
      viewport: { width, height },
      isMobile: width === 390,
      hasTouch: width === 390,
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await openGame(page)
    await meet(page, 'hoa')
    await fixture(page)
    await page.waitForFunction(() => {
      const history = document.querySelector('.conversation-history')
      return (
        history &&
        history.scrollHeight - history.scrollTop - history.clientHeight < 3
      )
    })
    const initial = await metrics(page)
    assert.equal(initial.dialogScrollTop, 0)
    assert.ok(
      initial.dialogScrollHeight <= initial.dialogClientHeight + 1,
      'dialog has no phantom outer scroll range'
    )
    assert.ok(
      initial.composer.bottom <= initial.dialog.bottom - 10,
      'composer fits inside the dialog'
    )
    assert.ok(initial.history.height > 40, 'chat retains usable height')
    assert.ok(
      initial.dialog.top >= 0 && initial.dialog.bottom <= height,
      'dialog fits the viewport'
    )
    await page.screenshot({
      path: `${out}/activity-${width}x${height}.png`,
    })
    const history = page.locator('.conversation-history')
    if (width === 390) {
      const session = await context.newCDPSession(page)
      const box = await history.boundingBox()
      const x = box.x + box.width / 2
      const start = box.y + 15
      const end = box.y + box.height - 15
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x, y: start }],
      })
      for (let step = 1; step <= 8; step++) {
        await session.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x, y: start + ((end - start) * step) / 8 }],
        })
        await page.waitForTimeout(20)
      }
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: [],
      })
      await page.waitForFunction(
        (before) =>
          document.querySelector('.conversation-history').scrollTop <
          before - 10,
        initial.historyScrollTop
      )
      await session.detach()
    }
    await history.hover()
    await page.mouse.wheel(0, -10000)
    await page.waitForFunction(
      () => document.querySelector('.conversation-history').scrollTop < 2
    )
    const scrolled = await metrics(page)
    assert.equal(scrolled.dialogScrollTop, 0)
    assert.ok(
      Math.abs(scrolled.heading.top - initial.heading.top) <= 1,
      'header stays in place'
    )
    assert.ok(
      Math.abs(scrolled.composer.top - initial.composer.top) <= 1,
      'composer stays in place'
    )
    // Keyboard focus and a real submission must not scroll the outer dialog.
    await page.route('**/npc/hoa/interact', (route) =>
      route.fulfill({ status: 503, body: '' })
    )
    await page
      .getByLabel('Your message', { exact: true })
      .fill('Thanks for the neighborhood story.')
    await page
      .getByRole('button', { name: 'Send message', exact: true })
      .click()
    await page
      .locator('#npc-message:not([disabled])')
      .waitFor({ timeout: 45000 })
    await page.waitForTimeout(150)
    const afterSend = await metrics(page)
    assert.equal(afterSend.dialogScrollTop, 0)
    assert.ok(
      afterSend.historyScrollTop < 3,
      'new replies do not interrupt reading older messages'
    )
    await history.hover()
    await page.mouse.wheel(0, 20000)
    await page.waitForFunction(() => {
      const el = document.querySelector('.conversation-history')
      return el.scrollHeight - el.clientHeight - el.scrollTop < 3
    })
    await page.mouse.wheel(0, 2000)
    await page.waitForTimeout(150)
    assert.equal(
      (await metrics(page)).dialogScrollTop,
      0,
      'scrolling past chat end does not move the dialog'
    )
    await page.screenshot({ path: `${out}/chat-${width}x${height}.png` })
    // Verify the restyled activity through real language controls on a taller view.
    if (width === 390 && height === 844) {
      await page
        .getByRole('button', { name: 'Close panel', exact: true })
        .click()
      await page
        .getByRole('button', { name: 'Pause game', exact: true })
        .click()
      await page.getByLabel('Language / Ngôn ngữ').selectOption('vi')
      await page
        .getByRole('button', { name: 'Tiếp tục khám phá', exact: true })
        .click()
      await meet(page, 'hoa')
      assert.match(
        await page.locator('.activity-scene-heading').innerText(),
        /Một thoáng khu phố/
      )
      await page.screenshot({ path: `${out}/activity-vi-390.png` })
    }
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth
      ),
      false
    )
    assert.deepEqual(errors, [])
    results.push({
      width,
      height,
      initial,
      scrolled,
      afterSend,
      errors,
      state: (await diagnostics(page)).state.screen,
    })
    await context.close()
    console.log(`Chat scroll flow passed: ${width}x${height}`)
  }
  await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2))
} finally {
  await browser.close()
}

import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import {
  chromium,
  diagnostics,
  enterPlay,
  executablePath,
  gameUrl,
  meet,
} from './qa-quest-flow.mjs'

// Vietnamese browser → Vietnamese UI; real controls switch, persist, and reset it.
const out = process.env.QA_OUTPUT || 'artifacts/i18n'
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ headless: true, executablePath })
const results = []
const lang = (page) => page.evaluate(() => document.documentElement.lang)
try {
  for (const width of [1440, 390]) {
    const mobile = width === 390
    const context = await browser.newContext({
      locale: 'vi-VN',
      viewport: { width, height: mobile ? 844 : 900 },
      isMobile: mobile,
      hasTouch: mobile,
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    const result = { width }

    await page.goto(gameUrl)
    const start = page.getByRole('button', {
      name: /^(Bắt đầu khám phá$|Tiếp tục hành trình)/,
    })
    await start.waitFor({ timeout: 45000 })
    assert.equal(await lang(page), 'vi')
    assert.match(await page.title(), /một chuyến đi nhỏ/)
    result.browserDefault = await page.locator('.title-subtitle').innerText()
    assert.equal(result.browserDefault, 'Một chuyến đi nhỏ')
    await page.screenshot({ path: `${out}/title-vi-${width}.png` })

    await page.getByRole('button', { name: 'English', exact: true }).click()
    await page.getByText('A little journey', { exact: true }).waitFor()
    assert.equal(await lang(page), 'en')
    assert.equal(
      await page
        .getByRole('button', { name: 'English', exact: true })
        .getAttribute('aria-pressed'),
      'true'
    )
    await page.reload()
    await page
      .getByRole('button', { name: /^(Start exploring$|Continue journey)/ })
      .waitFor({ timeout: 45000 })
    assert.equal(await lang(page), 'en')
    result.persistedAfterReload = await page
      .locator('.title-subtitle')
      .innerText()

    await enterPlay(page)
    await page.waitForFunction(
      () => window.__THREE_GAME_DIAGNOSTICS__?.state.frame > 30
    )
    await page.getByRole('button', { name: 'Pause game', exact: true }).click()
    await page.getByLabel('Language / Ngôn ngữ').selectOption('vi')
    await page.getByRole('heading', { name: 'Cứ thong thả.' }).waitFor()
    assert.equal(await lang(page), 'vi')
    assert.equal(
      (await diagnostics(page)).state.screen,
      'paused',
      'switching language keeps the pause menu open'
    )
    await page.screenshot({ path: `${out}/pause-vi-${width}.png` })
    await page
      .getByRole('button', { name: 'Tiếp tục khám phá', exact: true })
      .click()
    await page.getByRole('button', { name: 'Tạm dừng', exact: true }).waitFor()
    result.hud = await page.locator('.game-header').innerText()

    await page.getByRole('button', { name: 'Mở nhật ký hành trình' }).click()
    await page
      .getByRole('heading', { name: 'Hành trình nhỏ của bạn' })
      .waitFor()
    result.journal = (await page.locator('dialog').innerText()).slice(0, 200)
    await page.screenshot({ path: `${out}/journal-vi-${width}.png` })
    await page.getByRole('button', { name: 'Đóng bảng', exact: true }).click()

    await meet(page, 'hoa')
    const npcReplies = page.locator('dialog.conversation .speech.assistant')
    await page.locator('.activity-scene').waitFor()
    assert.equal(await npcReplies.count(), 0)
    result.activity = await page.locator('.activity-scene').innerText()
    await page.getByLabel('Tin nhắn của bạn').fill('Chợ hôm nay có gì ngon?')
    await page
      .getByRole('button', { name: 'Gửi tin nhắn', exact: true })
      .click()
    await page
      .locator('#npc-message:not([disabled])')
      .waitFor({ timeout: 45000 })
    result.reply = await npcReplies.last().innerText()
    result.replySource = (await diagnostics(page)).state.source
    await page.screenshot({ path: `${out}/chat-vi-${width}.png` })
    await page.getByRole('button', { name: 'Đóng bảng', exact: true }).click()

    await page.getByRole('button', { name: 'Tạm dừng', exact: true }).click()
    await page.getByLabel('Language / Ngôn ngữ').selectOption('en')
    await page.getByRole('heading', { name: 'Take your time.' }).waitFor()
    await Promise.all([
      page.waitForEvent('load'),
      page
        .getByRole('button', { name: 'Clear saved data', exact: true })
        .click(),
    ])
    await page
      .getByRole('button', { name: 'Bắt đầu khám phá', exact: true })
      .waitFor({ timeout: 45000 })
    result.afterClear = await lang(page)
    assert.equal(result.afterClear, 'vi', 'clear saved data → browser default')

    assert.equal(
      await page.evaluate(() => document.body.scrollWidth > innerWidth),
      false,
      `horizontal overflow at ${width}`
    )
    assert.deepEqual(errors, [], `page errors at ${width}`)
    results.push(result)
    console.log(`ok ${width}`, JSON.stringify(result))
    await context.close()
  }
  await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2))
  console.log('i18n verification passed')
} finally {
  await browser.close()
}

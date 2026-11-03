import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium, executablePath } from './qa-quest-flow.mjs'

const origin = process.env.GAME_ORIGIN || 'http://127.0.0.1:58000'
const out = process.env.QA_OUTPUT || 'artifacts/quest-completion/browser'
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ headless: true, executablePath })
const results = []
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      isMobile: width === 390,
      hasTouch: width === 390,
    })
    const page = await context.newPage()
    const errors = [],
      requests = [],
      warnings = []
    page.on('pageerror', (error) => errors.push(error.message))
    let activeCase = ''
    page.on('request', (request) => {
      const url = new URL(request.url())
      if (url.pathname.startsWith('/api/') || url.port === '58001')
        requests.push({ method: request.method(), path: url.pathname })
    })
    page.on('console', (message) => {
      if (message.text().includes('Too many active WebGL contexts'))
        warnings.push(message.text())
    })
    await page.goto(`${origin}/?questDebug`)
    await page.getByRole('heading', { level: 1 }).waitFor()
    const cacheBefore = await page.evaluate(async () => {
      const { queryClient } = await import('/src/shared/api/query.ts')
      return JSON.stringify(
        queryClient
          .getQueryCache()
          .getAll()
          .map((q) => ({ key: q.queryKey, data: q.state.data }))
      )
    })
    let count = 0
    for (const locale of ['en', 'vi']) {
      await page.locator('header select').selectOption(locale)
      const npcSelect = page.locator('.workshop-controls select').nth(0)
      const npcs = await npcSelect
        .locator('option')
        .evaluateAll((options) => options.map((option) => option.value))
      assert.equal(npcs.length, 29)
      for (const npc of npcs) {
        await npcSelect.selectOption(npc)
        const questSelect = page.locator('.workshop-controls select').nth(1)
        const seeds = await questSelect.locator('option').count()
        for (let index = 0; index < seeds; index++) {
          if (width === 390 && index > 0) continue
          await questSelect.selectOption(String(index))
          const title = await page.locator('.workshop-quest h2').innerText()
          activeCase = `${width}:${locale}:${npc}:${index}:${title}`
          await page
            .getByRole('button', {
              name:
                locale === 'en' ? 'Replay completion' : 'Xem lúc hoàn thành',
              exact: true,
            })
            .click()
          const dialog = page.locator('.reward-dialog')
          await dialog.waitFor()
          assert.equal(await dialog.locator('h2').innerText(), title)
          assert(
            (await dialog.locator('.reward-payoff').innerText()).trim().length >
              15
          )
          await page
            .waitForFunction(() => {
              const image = document.querySelector('.reward-art img')
              return image?.complete && image.naturalWidth >= 160
            })
            .catch(async (error) => {
              console.error(
                'ART_FAILURE',
                activeCase,
                await page
                  .locator('.reward-art')
                  .innerHTML()
                  .catch(() => 'no dialog'),
                errors
              )
              throw error
            })
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth > innerWidth
            ),
            false
          )
          assert(
            (await dialog.innerText()).includes(
              locale === 'en' ? 'thank-you from' : 'Lời cảm ơn từ'
            )
          )
          if (npc === 'hoa' && index === 0)
            await page.screenshot({
              path: `${out}/completion-${locale}-${width}.png`,
            })
          await dialog
            .getByRole('button', {
              name: locale === 'en' ? 'Close panel' : 'Đóng bảng',
              exact: true,
            })
            .click()
          count++
        }
      }
    }
    await page.locator('header select').selectOption('en')
    await page.locator('.workshop-controls select').nth(0).selectOption('hoa')
    await page
      .locator('.workshop-controls select')
      .nth(2)
      .selectOption('multiple')
    await page
      .getByRole('button', { name: 'Replay completion', exact: true })
      .click()
    await page
      .getByRole('button', { name: 'Next thank-you (1 left)', exact: true })
      .click()
    await page
      .locator('.reward-dialog')
      .getByRole('button', { name: 'Continue exploring', exact: true })
      .click()
    await page.locator('.reward-dialog').waitFor({ state: 'detached' })
    await page
      .getByRole('link', { name: 'Wardrobe inspector', exact: true })
      .click()
    await page.waitForSelector('.workshop-catalog .wardrobe-card')
    assert.equal(
      await page.locator('.workshop-catalog .wardrobe-card').count(),
      27
    )
    assert.equal(await page.locator('canvas').count(), 1)
    for (const image of await page.locator('.wardrobe-card img').all())
      await image.scrollIntoViewIfNeeded()
    await page.waitForFunction(() =>
      [...document.querySelectorAll('.wardrobe-card img')].every(
        (image) => image.complete && image.naturalWidth > 0
      )
    )
    for (const body of ['man', 'woman']) {
      await page.locator('.workshop-controls select').nth(0).selectOption(body)
      const hat = page
        .locator('.wardrobe-card')
        .filter({ has: page.getByText('nón lá hat', { exact: true }) })
      await hat.getByRole('button', { name: 'Equip', exact: true }).click()
      await hat.getByRole('button', { name: 'Unequip', exact: true }).waitFor()
      await page
        .locator('.workshop-controls select')
        .nth(1)
        .selectOption('walk')
      await page
        .locator('.workshop-controls select')
        .nth(2)
        .selectOption('side')
      await page.getByRole('checkbox', { name: 'Freeze animation' }).check()
      await page.getByRole('checkbox', { name: 'Show anchors' }).check()
      await page
        .getByRole('button', { name: 'Clear outfit', exact: true })
        .click()
      await page.getByRole('checkbox', { name: 'Show anchors' }).uncheck()
    }
    await page.screenshot({ path: `${out}/wardrobe-${width}.png` })
    const cacheAfter = await page.evaluate(async () => {
      const { queryClient } = await import('/src/shared/api/query.ts')
      return JSON.stringify(
        queryClient
          .getQueryCache()
          .getAll()
          .map((q) => ({ key: q.queryKey, data: q.state.data }))
      )
    })
    assert.equal(
      cacheAfter,
      cacheBefore,
      'inspectors must not modify persisted query data'
    )
    assert.equal(
      requests.length,
      0,
      'inspectors must not call gameplay backend'
    )
    assert.deepEqual(errors, [])
    assert.deepEqual(warnings, [])
    results.push({
      width,
      completionsReviewed: count,
      catalog: 27,
      gameplayRequests: requests.length,
      errors,
      warnings,
    })
    await context.close()
  }
  await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2))
  console.log('COMPLETION_WORKSHOP_QA_OK', JSON.stringify(results))
} finally {
  await browser.close()
}

import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium, executablePath, gameUrl } from './qa-quest-flow.mjs'
import {
  bind,
  enterLivePlay,
  meetLive,
  saved,
} from './qa-shops-live-helpers.mjs'

const out = 'artifacts/shops-live'
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ headless: true, executablePath })
const results = []
let currentPage
const observed = []
const goods = [
  {
    id: 'coffee',
    npc: 'mai',
    at: [-30, 8],
    price: 3,
    en: 'iced milk coffee',
    vi: 'cà phê sữa',
  },
  {
    id: 'banana',
    npc: 'fruit-vendor',
    at: [-11, 2],
    price: 2,
    en: 'ripe banana',
    vi: 'chuối chín',
  },
  {
    id: 'baguette',
    npc: 'bread-vendor',
    at: [-34, 2],
    price: 5,
    en: 'bánh mì',
    vi: 'bánh mì',
  },
  {
    id: 'pho',
    npc: 'hoa',
    at: [-23, 3.5],
    price: 8,
    en: 'bowl of phở',
    vi: 'tô phở',
  },
]

try {
  for (const width of process.env.QA_WIDTH
    ? [Number(process.env.QA_WIDTH)]
    : [1440, 390]) {
    for (const locale of process.env.QA_LOCALE
      ? [process.env.QA_LOCALE]
      : ['en', 'vi']) {
      const vi = locale === 'vi'
      const context = await browser.newContext({
        viewport: { width, height: width === 390 ? 844 : 900 },
        locale: vi ? 'vi-VN' : 'en-US',
        isMobile: width === 390,
        hasTouch: width === 390,
      })
      const page = await context.newPage()
      currentPage = page
      const errors = []
      const receipts = []
      page.on('pageerror', (error) => errors.push(error.message))
      page.on('response', async (response) => {
        if (new URL(response.url()).pathname.endsWith('/me/profile'))
          observed.push({
            status: response.status(),
            body: await response.json().catch(() => null),
          })
        if (
          /\/me\/(shop\/buy|items\/use)$/.test(
            new URL(response.url()).pathname
          ) &&
          response.ok()
        ) {
          const body = await response.json().catch(() => null)
          if (body)
            receipts.push({
              path: new URL(response.url()).pathname,
              receipt: body.receipt,
            })
        }
      })
      await page.goto(gameUrl)
      await bind(page)
      await page
        .getByRole('button', {
          name: vi ? 'Tiếng Việt' : 'English',
          exact: true,
        })
        .click()
      await page.locator('#player-name').fill('Shop QA')
      await enterLivePlay(page)
      const playerId = (await saved(page)).id
      const purchases = []
      for (const good of goods) {
        await meetLive(page, good, vi)
        const before = await saved(page)
        const response = page.waitForResponse(
          (response) =>
            /\/me\/shop\/buy$/.test(new URL(response.url()).pathname) &&
            response.request().method() === 'POST'
        )
        await page
          .getByRole('button', {
            name: `${vi ? 'Mua' : 'Buy'} ${good[locale]}`,
            exact: true,
          })
          .click()
        const bought = await response
        assert.equal(bought.status(), 200)
        const after = (await bought.json()).player
        assert.equal(after.world.currency, before.world.currency - good.price)
        assert.equal(
          after.world.inventory[good.id],
          (before.world.inventory[good.id] ?? 0) + 1
        )
        await page.waitForFunction(
          ([id, count]) =>
            window.liveShopQa.game.state.world.inventory[id] === count,
          [good.id, after.world.inventory[good.id]]
        )
        purchases.push({ itemId: good.id, currency: after.world.currency })
        assert.equal(await page.locator('.npc-shop .good-icon').count(), 1)
      }
      await page.screenshot({ path: `${out}/shop-${locale}-${width}.png` })
      // A second phở leaves less than its price; the actual control disables buying.
      const pho = goods.at(-1)
      await page
        .getByRole('button', {
          name: `${vi ? 'Mua' : 'Buy'} ${pho[locale]}`,
          exact: true,
        })
        .click()
      await page.waitForFunction(
        () => window.liveShopQa.game.state.world.inventory.pho === 2
      )
      assert(
        await page
          .getByRole('button', {
            name: `${vi ? 'Mua' : 'Buy'} ${pho[locale]}`,
            exact: true,
          })
          .isDisabled()
      )
      const beforeRefusal = await saved(page)
      const rejected = await page.evaluate(async () => {
        const { apiUrl, authorizationHeaders } = window.liveShopQa
        const response = await fetch(apiUrl('/me/shop/buy'), {
          method: 'POST',
          credentials: 'include',
          headers: {
            ...authorizationHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requestId: crypto.randomUUID(),
            npcId: 'hoa',
            itemId: 'pho',
            events: [],
          }),
        })
        return { status: response.status, body: await response.json() }
      })
      assert.equal(rejected.status, 409)
      assert.equal(rejected.body.error, 'insufficient_funds')
      assert.equal(
        (await saved(page)).world.currency,
        beforeRefusal.world.currency
      )
      await page.keyboard.press('Escape')
      await page.keyboard.press('j')
      for (const good of goods) {
        const response = page.waitForResponse(
          (response) =>
            /\/me\/items\/use$/.test(new URL(response.url()).pathname) &&
            response.request().method() === 'POST'
        )
        await page
          .getByRole('button', {
            name: `${vi ? 'Dùng' : 'Use'} ${good[locale]}`,
            exact: true,
          })
          .click()
        const consumed = await response
        assert.equal(consumed.status(), 200)
        await page.waitForFunction(
          () => !document.querySelector('.consumable-bag button[disabled]')
        )
      }
      const consumedSave = await saved(page)
      assert.equal(consumedSave.world.inventory.coffee, 0)
      assert.equal(consumedSave.world.inventory.banana, 0)
      assert.equal(consumedSave.world.inventory.baguette, 0)
      assert.equal(consumedSave.world.inventory.pho, 1)
      assert.deepEqual(
        consumedSave.world.effects.map((effect) => effect.itemId).sort(),
        ['baguette', 'coffee', 'pho']
      )
      await page.screenshot({ path: `${out}/bag-${locale}-${width}.png` })
      await page.reload()
      await bind(page)
      assert.equal((await saved(page)).id, playerId)
      await page.waitForFunction(
        () => window.liveShopQa.game.state.world.effects?.length === 3
      )
      assert.deepEqual(
        await page.evaluate(() =>
          window.liveShopQa.game.state.world.effects
            .map((effect) => effect.itemId)
            .sort()
        ),
        ['baguette', 'coffee', 'pho']
      )
      await enterLivePlay(page)
      await page.waitForFunction(() => {
        const meter = document.querySelector('#stamina-meter')
        return (
          Number(meter?.getAttribute('aria-valuenow')) === 150 &&
          Number(meter?.getAttribute('aria-valuemax')) === 150
        )
      })
      await page.screenshot({ path: `${out}/reload-${locale}-${width}.png` })
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth
        ),
        false
      )
      assert.deepEqual(errors, [])
      results.push({
        width,
        locale,
        playerId,
        realBackend: true,
        purchases,
        consumption: ['coffee', 'banana', 'baguette', 'pho'],
        reloadEffects: true,
        reloadStaminaFull: true,
        insufficientFunds: rejected.status,
        receipts: receipts.length,
        errors,
      })
      await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2))
      console.log('LIVE_SHOP_FLOW_OK', JSON.stringify(results.at(-1)))
      await context.close()
    }
  }
} catch (error) {
  const state = await currentPage
    ?.evaluate(() => ({
      game: window.liveShopQa?.game.state,
      dom: document.body.innerText,
    }))
    .catch(() => null)
  await currentPage?.screenshot({ path: `${out}/failure.png` }).catch(() => {})
  await writeFile(
    `${out}/failure.json`,
    JSON.stringify({ error: error.message, results, observed, state }, null, 2)
  )
  throw error
} finally {
  await browser.close()
}

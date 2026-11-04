import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium, executablePath, gameUrl } from './qa-quest-flow.mjs'
import { mockRareCommerce } from './qa-shops-fixtures.mjs'
import { bind, enterLivePlay, meetLive } from './qa-shops-live-helpers.mjs'

const out = 'artifacts/shop-design'
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ headless: true, executablePath })
const results = []
let current
const goods = [
  {
    id: 'coffee',
    npc: 'mai',
    at: [-30, 8],
    en: 'iced milk coffee',
    vi: 'cà phê sữa',
  },
  {
    id: 'banana',
    npc: 'fruit-vendor',
    at: [-11, 2],
    en: 'ripe banana',
    vi: 'chuối chín',
  },
  {
    id: 'baguette',
    npc: 'bread-vendor',
    at: [-34, 2],
    en: 'bánh mì',
    vi: 'bánh mì',
  },
  { id: 'pho', npc: 'hoa', at: [-23, 3.5], en: 'bowl of phở', vi: 'tô phở' },
]
const rares = ['lacquer-non-la', 'silk-scarf', 'festival-ao-dai']
async function artReady(page, id) {
  await page.waitForFunction((id) => {
    const img = document.querySelector(`[data-item-art="${id}"] img`)
    return img?.complete && img.naturalWidth > 0
  }, id)
  assert.equal(await page.locator('.npc-shop canvas').count(), 0)
}
async function fits(page) {
  const checks = await page.evaluate(() => ({
    page: document.documentElement.scrollWidth <= innerWidth,
    shelf: [...document.querySelectorAll('.npc-shop')].every(
      (el) => el.scrollWidth <= el.clientWidth + 1
    ),
    controls: [...document.querySelectorAll('.npc-shop button')].every(
      (el) => el.getBoundingClientRect().height >= 44
    ),
  }))
  assert.deepEqual(checks, { page: true, shelf: true, controls: true })
}
async function setSale(page, id, expired = false) {
  await page.evaluate(
    ({ id, expired }) => {
      const { game, update, city } = window.liveShopQa
      update({ world: { ...game.state.world, currency: 2000 } })
      city.setState((value) => ({
        ...value,
        revision: Number.MAX_SAFE_INTEGER,
        rareOffer: {
          id: `design-${id}`,
          npcId: 'mai',
          unlockId: id,
          price:
            id === 'lacquer-non-la' ? 800 : id === 'silk-scarf' ? 1100 : 1500,
          startedAt: Date.now() - 1000,
          endsAt: Date.now() + (expired ? -1 : 600000),
        },
      }))
    },
    { id, expired }
  )
}
async function saveFixture(page) {
  return page.evaluate(() => {
    const s = window.liveShopQa.game.state
    return {
      id: s.guestId,
      name: s.guestName,
      body: s.body,
      color: s.guestColor,
      revision: s.serverRevision + 1,
      friendship: s.friendship,
      world: s.world,
      quests: s.quests,
      completed: s.completed,
      reputation: s.reputation,
      unlocks: s.unlocks,
    }
  })
}
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
      current = page
      const errors = []
      page.on('pageerror', (error) => errors.push(error.message))
      await page.goto(gameUrl)
      await bind(page)
      await page
        .getByRole('button', {
          name: vi ? 'Tiếng Việt' : 'English',
          exact: true,
        })
        .click()
      await page.locator('#player-name').fill('Shop Design QA')
      await enterLivePlay(page)
      for (const good of goods) {
        await meetLive(page, good, vi)
        await artReady(page, good.id)
        await fits(page)
        await page
          .getByRole('button', {
            name: `${vi ? 'Mua' : 'Buy'} ${good[locale]}`,
            exact: true,
          })
          .click()
        await page.waitForFunction(
          (id) => window.liveShopQa.game.state.world.inventory[id] > 0,
          good.id
        )
        await page.screenshot({
          path: `${out}/${good.id}-${locale}-${width}.png`,
        })
      }
      await page.keyboard.press('Escape')
      await page.keyboard.press('j')
      for (const good of goods)
        await page.waitForFunction(
          (id) =>
            document.querySelector(`[data-item-art="${id}"] img`)
              ?.naturalWidth > 0,
          good.id
        )
      await page
        .getByRole('button', {
          name: vi ? 'Dùng cà phê sữa' : 'Use iced milk coffee',
          exact: true,
        })
        .click()
      await page.waitForFunction(() =>
        window.liveShopQa.game.state.world.effects?.some(
          (effect) => effect.itemId === 'coffee'
        )
      )
      await page.screenshot({ path: `${out}/bag-${locale}-${width}.png` })
      await page.keyboard.press('Escape')
      await meetLive(page, goods[0], vi)
      for (const id of rares) {
        await setSale(page, id)
        await artReady(page, id)
        await fits(page)
        await page.screenshot({ path: `${out}/${id}-${locale}-${width}.png` })
      }
      await setSale(page, rares[0])
      const save = await saveFixture(page)
      await mockRareCommerce(page, save)
      await page.locator('.rare-offer .primary-button').click()
      await page.waitForFunction(() =>
        window.liveShopQa.game.state.unlocks.owned.includes('lacquer-non-la')
      )
      await page
        .locator('.rare-offer')
        .getByRole('button', { name: vi ? 'Mặc' : 'Equip', exact: true })
        .click()
      await page.waitForFunction(
        () =>
          window.liveShopQa.game.state.unlocks.equipped.hat === 'lacquer-non-la'
      )
      await setSale(page, rares[1], true)
      await page.waitForFunction(
        () => document.querySelector('.rare-offer .primary-button')?.disabled
      )
      await page.screenshot({ path: `${out}/expired-${locale}-${width}.png` })
      const attempts = []
      const retrySave = await saveFixture(page)
      await page.route('**/me/shop/buy', async (route) => {
        const request = route.request().postDataJSON()
        attempts.push(request.requestId)
        if (attempts.length === 1)
          return route.fulfill({
            status: 503,
            json: { error: 'temporary_failure' },
          })
        retrySave.world.currency -= 3
        retrySave.world.inventory.coffee =
          (retrySave.world.inventory.coffee ?? 0) + 1
        retrySave.revision++
        return route.fulfill({
          json: {
            player: retrySave,
            receipt: { requestId: request.requestId, restore: 0 },
          },
        })
      })
      await page
        .getByRole('button', {
          name: vi ? 'Mua cà phê sữa' : 'Buy iced milk coffee',
          exact: true,
        })
        .click()
      await page.locator('.shop-retry').waitFor()
      await page.screenshot({ path: `${out}/retry-${locale}-${width}.png` })
      await page.locator('.shop-retry button').click()
      await page.locator('.shop-retry').waitFor({ state: 'detached' })
      assert.equal(attempts.length, 2)
      assert.equal(attempts[0], attempts[1])
      await page.route('**/images/shop/coffee.webp', (route) => route.abort())
      await page.reload()
      await bind(page)
      await enterLivePlay(page)
      await meetLive(page, goods[0], vi)
      await page
        .locator('[data-item-art="coffee"] .shop-art-fallback')
        .waitFor()
      await page.screenshot({
        path: `${out}/missing-art-${locale}-${width}.png`,
      })
      await page.unroute('**/images/shop/coffee.webp')
      await page
        .getByRole('button', {
          name: vi ? 'Trò chuyện' : 'Conversation',
          exact: true,
        })
        .click()
      await page
        .getByRole('button', { name: vi ? 'Cửa hàng' : 'Shop', exact: true })
        .click()
      await artReady(page, 'coffee')
      await fits(page)
      assert.deepEqual(errors, [])
      results.push({
        width,
        locale,
        generatedArtLoaded: [...goods.map((g) => g.id), ...rares],
        liveGoods: true,
        rareTransactions: 'synthetic HTTP and room sale fixture',
        canvasInShop: false,
        minimumControls: 44,
        imageFallbackAndRetry: true,
        transactionRetrySameId: true,
        errors,
      })
      await context.close()
    }
  }
  await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2))
  console.log('SHOP_DESIGN_QA_OK', JSON.stringify(results))
} catch (error) {
  if (current) {
    await current.screenshot({ path: `${out}/failure.png` }).catch(() => {})
    await writeFile(
      `${out}/failure.json`,
      JSON.stringify(
        {
          error: String(error),
          text: await current
            .locator('body')
            .innerText()
            .catch(() => ''),
        },
        null,
        2
      )
    )
  }
  throw error
} finally {
  await browser.close()
}

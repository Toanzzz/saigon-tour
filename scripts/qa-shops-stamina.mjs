import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium, executablePath, gameUrl, meet } from './qa-quest-flow.mjs'
import {
  assertExpiredRareOffer,
  captureShopFailure,
  mockRareCommerce,
} from './qa-shops-fixtures.mjs'

const out = 'artifacts/shops-stamina'
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ headless: true, executablePath })
const results = []
try {
  for (const width of process.env.QA_WIDTH
    ? [Number(process.env.QA_WIDTH)]
    : [1440, 390]) {
    for (const locale of process.env.QA_LOCALE
      ? [process.env.QA_LOCALE]
      : ['en', 'vi']) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        locale: locale === 'vi' ? 'vi-VN' : 'en-US',
        isMobile: width === 390,
        hasTouch: width === 390,
      })
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', (error) => errors.push(error.message))
      await page.route('**/*', (route) =>
        new URL(route.request().url()).port === '58001' ||
        new URL(route.request().url()).pathname.startsWith('/api/')
          ? route.abort()
          : route.continue()
      )
      await page.goto(gameUrl)
      await page.waitForFunction(() => window.__THREE_GAME_TEST_HOOKS__)
      await page.waitForFunction(async () => {
        const url = performance
          .getEntriesByType('resource')
          .map((e) => e.name)
          .find((url) => new URL(url).pathname === '/src/shared/state/game.ts')
        return url && (await import(url)).game.state.guestStatus !== 'loading'
      })
      await page.evaluate(async (locale) => {
        const load = (path) =>
          import(
            performance
              .getEntriesByType('resource')
              .map((e) => e.name)
              .filter((url) => new URL(url).pathname === path)
              .at(-1) || path
          )
        const [state, city, stamina, language, controls] = await Promise.all([
          load('/src/shared/state/game.ts'),
          load('/src/shared/api/city.ts'),
          load('/src/features/stamina/store.ts'),
          load('/src/paraglide/runtime.js'),
          load('/src/shared/runtime/input.ts'),
        ])
        window.__THREE_GAME_TEST_HOOKS__.setState('active-play')
        language.setLocale(locale, { reload: false })
        state.update({ guestStatus: 'offline', muted: true })
        window.shopQa = { ...state, city: city.city, ...stamina, ...controls }
      }, locale)
      await page.waitForFunction(
        () => window.__THREE_GAME_DIAGNOSTICS__?.state?.frame > 30
      )
      const vi = locale === 'vi'
      // The shipped encounter and Shop controls perform every purchase.
      await meet(page, 'mai')
      await page
        .getByRole('button', { name: vi ? 'Cửa hàng' : 'Shop', exact: true })
        .click()
      const coffee = page.getByRole('button', {
        name: vi ? 'Mua cà phê sữa' : 'Buy iced milk coffee',
        exact: true,
      })
      await coffee.click()
      await page.waitForFunction(
        () => window.shopQa.game.state.world.inventory.coffee === 1
      )
      assert.equal(
        await page.evaluate(() => window.shopQa.game.state.world.currency),
        27
      )
      assert.equal(await page.locator('.npc-shop .good-icon').count(), 1)
      await page.screenshot({ path: `${out}/shop-${locale}-${width}.png` })
      await page.keyboard.press('Escape')
      await page.keyboard.press('j')
      await page
        .getByRole('button', {
          name: vi ? 'Dùng cà phê sữa' : 'Use iced milk coffee',
          exact: true,
        })
        .click()
      await page.waitForFunction(() =>
        window.shopQa.game.state.world.effects?.some(
          (e) => e.itemId === 'coffee'
        )
      )
      assert.equal(
        await page.evaluate(
          () => window.shopQa.game.state.world.inventory.coffee
        ),
        0
      )
      await page.screenshot({ path: `${out}/bag-${locale}-${width}.png` })
      await page.keyboard.press('Escape')
      // Position and near-empty stamina are fixtures; real keyboard/touch input exhausts it.
      await page.evaluate(() => {
        const { game, update, resetStamina, stepStamina } = window.shopQa
        update({ world: { ...game.state.world, effects: [] } })
        resetStamina()
        for (let i = 0; i < 118; i++) stepStamina(0.1, true, [], true)
        window.__THREE_GAME_TEST_HOOKS__.teleport(0, 12)
      })
      await page.waitForTimeout(200)
      const touchSession =
        width === 390 ? await context.newCDPSession(page) : null
      if (width === 390) {
        const control = await page.locator('.touch-sprint').boundingBox()
        const stick = await page.locator('.touch-stick').boundingBox()
        await touchSession.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [
            {
              x: control.x + control.width / 2,
              y: control.y + control.height / 2,
              id: 1,
            },
            {
              x: stick.x + stick.width / 2 + 30,
              y: stick.y + stick.height / 2,
              id: 2,
            },
          ],
        })
      } else {
        await page.keyboard.down('Shift')
        await page.keyboard.down('KeyD')
      }
      await page.waitForFunction(
        () => window.shopQa.stamina.state.exhausted,
        null,
        { timeout: 6000 }
      )
      await page.keyboard.up('KeyD')
      await page.keyboard.up('Shift')
      if (width === 390) {
        await touchSession.send('Input.dispatchTouchEvent', {
          type: 'touchEnd',
          touchPoints: [],
        })
      }
      assert.equal(await page.evaluate(() => window.shopQa.input.sprint), false)
      await page.screenshot({ path: `${out}/exhausted-${locale}-${width}.png` })
      await page.waitForFunction(
        () => !window.shopQa.stamina.state.exhausted,
        null,
        { timeout: 7000 }
      )
      assert(
        (await page.evaluate(() => window.shopQa.stamina.state.current)) >= 25
      )
      // Supply and reservation fixtures exercise the shipped Use control.
      await page.evaluate(async () => {
        const { game, update } = window.shopQa
        const { createQuest } = await import(
          '/@fs/Users/toan/code/hackathon/saigon-tour/packages/shared/src/index.ts'
        )
        const quest = createQuest({
          giverNpcId: 'mai',
          title: 'Reserved coffee',
          description: 'Deliver coffee.',
          scope: 'solo',
          steps: [{ type: 'DELIVER', itemId: 'coffee', npcId: 'hoa' }],
        })
        update({
          quests: [quest],
          world: {
            ...game.state.world,
            inventory: { coffee: 1, banana: 1, baguette: 1, pho: 1 },
          },
        })
      })
      await page.keyboard.press('j')
      assert(
        await page
          .getByRole('button', {
            name: vi ? 'Dùng cà phê sữa' : 'Use iced milk coffee',
            exact: true,
          })
          .isDisabled()
      )
      await page
        .getByRole('button', {
          name: vi ? 'Dùng tô phở' : 'Use bowl of phở',
          exact: true,
        })
        .click()
      await page.waitForFunction(() => window.shopQa.stamina.state.max === 150)
      await page.keyboard.press('Escape')
      // Timed-sale and HTTP responses are synthetic; transaction logic is tested server-side.
      await meet(page, 'mai')
      const save = await page.evaluate(() => {
        const { game, update, city } = window.shopQa
        update({
          guestStatus: 'online',
          quests: [],
          world: { ...game.state.world, currency: 2000 },
        })
        const sale = {
          id: 'qa-sale',
          npcId: 'mai',
          unlockId: 'lacquer-non-la',
          price: 800,
          startedAt: Date.now(),
          endsAt: Date.now() + 600000,
        }
        window.shopQa.sale = sale
        city.setState((value) => ({
          ...value,
          rareOffer: sale,
        }))
        const s = game.state
        return {
          id: crypto.randomUUID(),
          name: 'Shop QA',
          body: s.body,
          color: '#f6c568',
          revision: s.serverRevision + 1,
          friendship: s.friendship,
          world: s.world,
          quests: s.quests,
          completed: s.completed,
          reputation: s.reputation,
          unlocks: s.unlocks,
        }
      })
      await mockRareCommerce(page, save)
      await page
        .getByRole('button', { name: vi ? 'Cửa hàng' : 'Shop', exact: true })
        .click()
      await page.locator('.rare-offer .primary-button').click()
      await page.waitForFunction(() =>
        window.shopQa.game.state.unlocks.owned.includes('lacquer-non-la')
      )
      assert.equal(
        await page.evaluate(() => window.shopQa.game.state.world.currency),
        1200
      )
      // Failed matchmaking clears room state; restore this explicitly synthetic offer.
      await page.waitForTimeout(250)
      await page.evaluate(() =>
        window.shopQa.city.setState((value) => ({
          ...value,
          rareOffer: window.shopQa.sale,
        }))
      )
      await page
        .locator('.rare-offer')
        .getByRole('button', { name: vi ? 'Mặc' : 'Equip', exact: true })
        .click()
      await page.waitForFunction(
        () => window.shopQa.game.state.unlocks.equipped.hat === 'lacquer-non-la'
      )
      await page.screenshot({ path: `${out}/rare-${locale}-${width}.png` })
      await assertExpiredRareOffer(page)
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
        goods: 'offline shared rules',
        rare: 'synthetic HTTP and sale fixture',
        realControls: true,
        errors,
      })
      await context.close()
    }
  }
  await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2))
  console.log('SHOPS_STAMINA_QA_OK', JSON.stringify(results))
} catch (error) {
  await captureShopFailure(browser, out, error)
  throw error
} finally {
  await browser.close()
}

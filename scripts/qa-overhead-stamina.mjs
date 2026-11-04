import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium, executablePath, gameUrl } from './qa-quest-flow.mjs'

const out = 'artifacts/overhead-stamina'
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ headless: true, executablePath })
const results = []

async function sample(page) {
  return page.evaluate(() => {
    const { root, motion, stamina, game, input } = window.overheadQa
    const state = [...root._roots.values()][0].store.getState()
    const canvas = state.gl.domElement.getBoundingClientRect()
    const projected = state.camera.position.clone().copy(motion.position)
    projected.y += 1.85
    projected.project(state.camera)
    const meter = document.querySelector('#stamina-meter')
    const rect = meter.getBoundingClientRect()
    const expected = {
      x: canvas.left + ((projected.x + 1) / 2) * canvas.width,
      y: canvas.top + ((1 - projected.y) / 2) * canvas.height,
    }
    return {
      position: motion.position.toArray(),
      current: stamina.state.current,
      ariaCurrent: Number(meter.getAttribute('aria-valuenow')),
      max: stamina.state.max,
      boosted: stamina.state.boosted,
      sprinting: motion.sprinting,
      input: { x: input.x, z: input.z, sprint: input.sprint },
      guestStatus: game.state.guestStatus,
      frame: motion.frames,
      dt: motion.dt,
      className: meter.className,
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      anchorError: Math.hypot(
        rect.x + rect.width / 2 - expected.x,
        rect.y + rect.height / 2 - expected.y
      ),
      pointerEvents: getComputedStyle(meter).pointerEvents,
      fillColor: getComputedStyle(meter.querySelector('span')).backgroundColor,
    }
  })
}

async function sprint(page, context, width, duration) {
  let touch
  if (width === 390) {
    const button = await page.locator('.touch-sprint').boundingBox()
    const stick = await page.locator('.touch-stick').boundingBox()
    touch = await context.newCDPSession(page)
    await touch.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [
        {
          id: 1,
          x: button.x + button.width / 2,
          y: button.y + button.height / 2,
        },
        {
          id: 2,
          x: stick.x + stick.width / 2 + 30,
          y: stick.y + stick.height / 2,
        },
      ],
    })
  } else {
    await page.keyboard.down('Shift')
    await page.keyboard.down('KeyD')
  }
  await page.waitForTimeout(duration)
  const result = await sample(page)
  if (touch)
    await touch.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    })
  else {
    await page.keyboard.up('KeyD')
    await page.keyboard.up('Shift')
  }
  return result
}

try {
  for (const width of process.env.QA_WIDTH
    ? [Number(process.env.QA_WIDTH)]
    : [1440, 390]) {
    const vi = width === 390
    const context = await browser.newContext({
      viewport: { width, height: vi ? 844 : 900 },
      locale: vi ? 'vi-VN' : 'en-US',
      hasTouch: vi,
      isMobile: vi,
    })
    const page = await context.newPage()
    await page.addInitScript(() =>
      performance.setResourceTimingBufferSize(5000)
    )
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.route('**/*', (route) => {
      const url = new URL(route.request().url())
      return url.port === '58001' || url.pathname.startsWith('/api/')
        ? route.abort()
        : route.continue()
    })
    await page.goto(gameUrl)
    await page.waitForFunction(() => window.__THREE_GAME_TEST_HOOKS__)
    assert.equal(await page.locator('#stamina-meter').count(), 0)
    await page.evaluate(async (vi) => {
      const load = (path) =>
        import(
          performance
            .getEntriesByType('resource')
            .map((entry) => entry.name)
            .filter((url) => new URL(url).pathname === path)
            .at(-1) || path
        )
      const [state, stamina, runtime, root, language, controls] =
        await Promise.all([
          load('/src/shared/state/game.ts'),
          load('/src/features/stamina/store.ts'),
          load('/src/shared/runtime/motion.ts'),
          load('/node_modules/.vite/deps/@react-three_fiber.js'),
          load('/src/paraglide/runtime.js'),
          load('/src/shared/runtime/input.ts'),
        ])
      language.setLocale(vi ? 'vi' : 'en', { reload: false })
      window.__THREE_GAME_TEST_HOOKS__.setState('active-play')
      state.update({
        body: vi ? 'woman' : 'man',
        guestStatus: 'offline',
        muted: true,
        world: { ...state.game.state.world, inventory: { coffee: 1 } },
      })
      stamina.resetStamina()
      window.overheadQa = {
        ...state,
        ...stamina,
        ...runtime,
        root,
        ...controls,
      }
      window.__THREE_GAME_TEST_HOOKS__.teleport(0, 12)
    }, vi)
    await page.locator('#stamina-meter').waitFor()
    await page.waitForFunction(
      () => window.__THREE_GAME_DIAGNOSTICS__?.state.frame > 60
    )
    await page.waitForTimeout(700)
    const normal = await sample(page)
    assert(normal.rect.width >= 50 && normal.rect.width <= 64)
    assert(normal.rect.height >= 6 && normal.rect.height <= 12)
    assert(
      normal.anchorError < 6,
      `idle bar follows character: ${normal.anchorError}`
    )
    assert.equal(normal.pointerEvents, 'none')
    assert.equal(await page.locator('.stamina-hud').count(), 0)
    await page.screenshot({ path: `${out}/normal-${width}.png` })
    const moving = await sprint(page, context, width, 900)
    assert.equal(
      moving.current,
      moving.ariaCurrent,
      'QA uses the rendered stamina store'
    )
    await writeFile(
      `${out}/control-${width}.json`,
      JSON.stringify({ normal, moving }, null, 2)
    )
    assert(moving.current < 99)
    assert(moving.anchorError < 6, `moving anchor: ${moving.anchorError}`)
    assert(Math.abs(moving.position[0] - normal.position[0]) > 1)
    await page.keyboard.press('j')
    await page
      .getByRole('button', {
        name: vi ? 'Dùng cà phê sữa' : 'Use iced milk coffee',
        exact: true,
      })
      .click()
    await page.waitForFunction(() => window.overheadQa.stamina.state.boosted)
    await page.keyboard.press('Escape')
    const coffee = await sprint(page, context, width, 1300)
    assert.equal(coffee.current, coffee.max)
    assert(coffee.className.includes('is-boosted'))
    assert(coffee.anchorError < 6)
    assert.notEqual(coffee.fillColor, normal.fillColor)
    await page.screenshot({ path: `${out}/coffee-${width}.png` })
    if (!vi) {
      const canvas = page.locator('canvas').first()
      const rect = await canvas.boundingBox()
      await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2)
      await page.mouse.down({ button: 'right' })
      await page.mouse.move(
        rect.x + rect.width / 2 + 100,
        rect.y + rect.height / 2 + 20,
        { steps: 8 }
      )
      await page.mouse.up({ button: 'right' })
      await page.waitForTimeout(400)
      assert((await sample(page)).anchorError < 6)
    }
    await page.keyboard.press('Escape')
    assert.equal(await page.locator('#stamina-meter').count(), 0)
    await page.evaluate(() => {
      const { game, update } = window.overheadQa
      update({
        world: {
          ...game.state.world,
          effects: game.state.world.effects.map((effect) => ({
            ...effect,
            endsAt: Date.now() - 1,
          })),
        },
      })
    })
    await page.waitForFunction(() => !window.overheadQa.stamina.state.boosted)
    await page.keyboard.press('Escape')
    const expired = await sprint(page, context, width, 900)
    assert(expired.current < expired.max)
    assert(!expired.className.includes('is-boosted'))
    assert(expired.anchorError < 6)
    await page.screenshot({ path: `${out}/expired-${width}.png` })
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth
      ),
      false
    )
    assert.deepEqual(errors, [])
    results.push({
      width,
      locale: vi ? 'vi' : 'en',
      normal,
      moving,
      coffee,
      expired,
      errors,
    })
    await context.close()
  }
  await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2))
  console.log(
    'OVERHEAD_STAMINA_QA_OK',
    JSON.stringify(
      results.map(({ width, coffee, errors }) => ({
        width,
        full: coffee.current === coffee.max,
        errors,
      }))
    )
  )
} catch (error) {
  const page = browser.contexts().at(-1)?.pages().at(-1)
  if (page) {
    await page.screenshot({ path: `${out}/failure.png` }).catch(() => {})
    const state = await page
      .evaluate(() => ({
        stamina: window.overheadQa?.stamina.state,
        resources: performance
          .getEntriesByType('resource')
          .map((entry) => entry.name)
          .filter(
            (url) => new URL(url).pathname === '/src/features/stamina/store.ts'
          ),
        effects: window.overheadQa?.game.state.world.effects,
        text: document.body.innerText,
      }))
      .catch(() => null)
    await writeFile(
      `${out}/failure.json`,
      JSON.stringify({ error: String(error), state }, null, 2)
    )
  }
  throw error
} finally {
  await browser.close()
}

import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import {
  chromium,
  diagnostics,
  dismiss,
  executablePath,
  followQuest,
  meet,
  offerQuest,
  teleport,
} from './qa-quest-flow.mjs'

const url = new URL(process.env.GAME_URL || 'http://127.0.0.1:58000/')
url.searchParams.set('demo', '1')
url.searchParams.set('debug', '1')
const out = process.env.QA_OUTPUT || 'artifacts/demo'
const modes = (process.env.QA_MODES || 'live,offline').split(',')
await mkdir(out, { recursive: true })
const results = []
let currentPage
const browser = await chromium.launch({ headless: true, executablePath })
try {
  for (const mode of modes)
    for (const width of [1440, 390]) {
      const apiOffline = mode === 'offline' || process.env.QA_API === 'off'
      const context = await browser.newContext({
        locale: 'en-US',
        viewport: { width, height: width === 390 ? 844 : 900 },
        isMobile: width === 390,
        hasTouch: width === 390,
      })
      const page = await context.newPage()
      currentPage = page
      if (apiOffline) {
        await page.routeWebSocket('**/*', (socket) => socket.close())
        await page.route(`${url.origin}/api/**`, (route) => route.abort())
      }
      if (process.env.QA_SOCKET === 'off')
        await page.routeWebSocket('**/*', (socket) => socket.close())
      if (process.env.QA_PICKUPS === 'off')
        await page.route('**/me/pickups/**', (route) => route.abort())
      const errors = []
      const beats = []
      let demoRequests = 0
      page.on('pageerror', (error) => errors.push(error.message))
      page.on('request', (request) => {
        if (
          request.url().includes('/interact') &&
          request.method() === 'POST'
        ) {
          assert.equal(request.postDataJSON().demo, true)
          demoRequests++
        }
      })
      const sample = async (beat) => {
        const data = await diagnostics(page)
        beats.push({
          beat,
          calls: data.renderer.render.calls,
          triangles: data.renderer.render.triangles,
          fpsEma: data.fps,
        })
        await page.screenshot({ path: `${out}/${mode}-${width}-${beat}.png` })
      }
      await page.goto(url.toString())
      const start = page.getByRole('button', {
        name: 'Start demo',
        exact: true,
      })
      if (apiOffline) {
        const name = page.locator('#player-name')
        await name.waitFor()
        await name.fill('Demo Guest')
      }
      await start.click({ timeout: 60000 })
      await page.waitForFunction(
        () => window.__THREE_GAME_DIAGNOSTICS__?.state.screen === 'playing'
      )
      assert.equal((await diagnostics(page)).state.completed, 0)
      if (process.env.QA_SOCKET === 'off')
        assert.notEqual(
          (await diagnostics(page)).network.connection,
          'connected'
        )
      await sample('start')
      if (mode !== 'live') {
        if (apiOffline) {
          await page.routeWebSocket('**/*', (socket) => socket.close())
          await page.route(`${url.origin}/api/**`, (route) => route.abort())
          await page.route('**/me/**', (route) => route.abort())
        }
        await page.route('**/npc/*/interact', async (route) => {
          if (mode === 'timeout')
            await new Promise((resolve) => setTimeout(resolve, 100))
          await route.abort(
            mode === 'timeout' ? 'timedout' : 'connectionrefused'
          )
        })
      }
      const gag = await offerQuest(page)
      assert.match(gag.title, /two-bowl/i)
      await sample('quest')
      await dismiss(page)
      await teleport(page, -10, 13.5)
      const touch = page.locator('button.touch-interact')
      if (await touch.isVisible()) await touch.click()
      else await page.keyboard.press('e')
      await page.locator('.transport-dialog').waitFor()
      await page.getByRole('button', { name: /Motorbike taxi/ }).click()
      await page.getByLabel('Destination').selectOption('park')
      await page.getByRole('button', { name: /Board Motorbike taxi/ }).click()
      await page.waitForFunction(() =>
        Boolean(window.__THREE_GAME_DIAGNOSTICS__?.state.ride)
      )
      await sample('ride')
      await page.waitForFunction(
        () => !window.__THREE_GAME_DIAGNOSTICS__?.state.ride,
        null,
        { timeout: 60000 }
      )
      await followQuest(page, gag)
      await meet(page, 'hoa', { reward: true })
      await page.locator('.reward-dialog').waitFor({ timeout: 30000 })
      assert.equal((await diagnostics(page)).state.completed, 1)
      await sample('reward')
      const wear = page.getByRole('button', { name: 'Wear now', exact: true })
      if (mode === 'live' && (await wear.isVisible())) {
        await wear.click()
        await page.locator('.reward-dialog').waitFor({ state: 'detached' })
      } else await dismiss(page)
      const hub = page.getByRole('button', {
        name: 'Close city hub',
        exact: true,
      })
      if (await hub.isVisible()) await hub.click()
      const arc = await offerQuest(page)
      assert(arc.twist)
      await dismiss(page)
      await teleport(page, -24, 28)
      await meet(page, 'mai')
      await page.waitForFunction(
        (id) =>
          window.__THREE_GAME_DIAGNOSTICS__?.state.quests.find(
            (quest) => quest.id === id
          )?.twist?.replaced,
        arc.id
      )
      await sample('twist')
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth
        ),
        false
      )
      assert.deepEqual(errors, [])
      if (apiOffline) assert.equal(demoRequests, 0)
      else assert(demoRequests > 0)
      results.push({
        mode,
        width,
        demoRequests,
        errors,
        beats,
        performanceClaim: 'EMA diagnostic only; no hardware FPS acceptance',
      })
      await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2))
      await context.close()
    }
} catch (error) {
  if (currentPage && !currentPage.isClosed()) {
    await currentPage.screenshot({ path: `${out}/failure.png` })
    await writeFile(
      `${out}/failure.json`,
      JSON.stringify(
        {
          diagnostics: (await diagnostics(currentPage)) ?? null,
          error: String(error),
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
console.log('DEMO_QA_OK', JSON.stringify(results))

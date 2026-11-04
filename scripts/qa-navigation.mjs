import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import {
  chromium,
  diagnostics,
  dismiss,
  executablePath,
  openGame,
  teleport,
} from './qa-quest-flow.mjs'

const out = process.env.QA_OUTPUT || 'artifacts/navigation'
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ headless: true, executablePath })
const results = []
async function project(page, point) {
  return page.evaluate(async (point) => {
    const url = performance
      .getEntriesByType('resource')
      .map((entry) => entry.name)
      .find((name) => /\/three\.js\?/.test(name))
    const { PerspectiveCamera, Vector3 } = await import(url)
    const camera = window.__THREE_GAME_TEST_HOOKS__.camera()
    const at = window.__THREE_GAME_DIAGNOSTICS__.state.position
    const canvas = document.querySelector('canvas').getBoundingClientRect()
    const lens = new PerspectiveCamera(
      camera.fov,
      canvas.width / canvas.height,
      0.1,
      220
    )
    lens.position.set(...camera.position)
    lens.lookAt(at[0], at[1] + 0.7, at[2])
    lens.updateMatrixWorld()
    const p = new Vector3(...point).project(lens)
    return {
      x: canvas.x + ((p.x + 1) * canvas.width) / 2,
      y: canvas.y + ((1 - p.y) * canvas.height) / 2,
    }
  }, point)
}
try {
  for (const width of [1440, 390]) {
    const mobile = width === 390
    const context = await browser.newContext({
      viewport: { width, height: mobile ? 844 : 900 },
      locale: 'en-US',
      isMobile: mobile,
      hasTouch: mobile,
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await openGame(page)
    await teleport(page, -23, 10)
    await page.waitForTimeout(1800)
    const start = (await diagnostics(page)).state.position
    const ground = await project(page, [-18, 0.05, 7])
    if (!mobile) {
      await page.mouse.click(ground.x, ground.y)
      await page.waitForFunction(
        () =>
          Math.hypot(
            window.__THREE_GAME_DIAGNOSTICS__.state.position[0] + 18,
            window.__THREE_GAME_DIAGNOSTICS__.state.position[2] - 7
          ) < 0.35,
        null,
        { timeout: 10000 }
      )
      results.push({
        width,
        groundArrival: (await diagnostics(page)).state.position,
      })
      const yaw = await page.evaluate(
        () => window.__THREE_GAME_TEST_HOOKS__.camera().yaw
      )
      await page.mouse.move(700, 450)
      await page.mouse.down({ button: 'right' })
      await page.mouse.move(790, 450, { steps: 10 })
      await page.mouse.up({ button: 'right' })
      assert(
        Math.abs(
          (await page.evaluate(
            () => window.__THREE_GAME_TEST_HOOKS__.camera().yaw
          )) - yaw
        ) > 0.3
      )
      assert(
        await page
          .locator('canvas')
          .first()
          .evaluate(
            (el) =>
              !el.dispatchEvent(
                new MouseEvent('contextmenu', {
                  bubbles: true,
                  cancelable: true,
                })
              )
          )
      )
      const at = (await diagnostics(page)).state.position
      await page.mouse.move(ground.x, ground.y)
      await page.mouse.down()
      await page.mouse.move(ground.x + 100, ground.y, { steps: 10 })
      await page.mouse.up()
      await page.waitForTimeout(800)
      assert(
        Math.hypot(
          (await diagnostics(page)).state.position[0] - at[0],
          (await diagnostics(page)).state.position[2] - at[2]
        ) < 0.5
      )
      // Real click and physics movement around the park fountain.
      await page.evaluate(() =>
        window.__THREE_GAME_TEST_HOOKS__.setState('active-play')
      )
      await page.waitForTimeout(300)
      await teleport(page, 30, -4)
      await page.waitForTimeout(1600)
      const around = await project(page, [30, 0.05, -17])
      await page.evaluate(() => {
        window.navigationSamples = []
        window.navigationSampler = setInterval(
          () =>
            window.navigationSamples.push(
              window.__THREE_GAME_DIAGNOSTICS__.state.position
            ),
          100
        )
      })
      await page.mouse.click(around.x, around.y)
      await page.waitForFunction(
        () =>
          Math.hypot(
            window.__THREE_GAME_DIAGNOSTICS__.state.position[0] - 30,
            window.__THREE_GAME_DIAGNOSTICS__.state.position[2] + 17
          ) < 0.35,
        null,
        { timeout: 15000 }
      )
      const samples = await page.evaluate(() => {
        clearInterval(window.navigationSampler)
        return window.navigationSamples
      })
      assert(
        samples.some((at) => Math.abs(at[0] - 30) > 2.5),
        'route detours around fountain'
      )
      results.push({
        width,
        fountainDetour: true,
        arrival: (await diagnostics(page)).state.position,
      })
      await page.evaluate(() =>
        window.__THREE_GAME_TEST_HOOKS__.setState('active-play')
      )
      await page.waitForTimeout(1600)
      const cancelPoint = await project(page, [-18, 0.05, 7])
      await page.mouse.click(cancelPoint.x, cancelPoint.y)
      await page.keyboard.down('a')
      await page.waitForTimeout(300)
      await page.keyboard.up('a')
      await page.waitForTimeout(350)
      const afterKey = (await diagnostics(page)).state.position
      await page.waitForTimeout(1000)
      const stopped = (await diagnostics(page)).state.position
      assert(
        Math.hypot(afterKey[0] - stopped[0], afterKey[2] - stopped[2]) < 0.5,
        'keyboard cancels route'
      )
      results.push({ width, keyboardCancellation: true })
      // Reset the camera via a journey fixture, then click Hoa from outside talk range.
      await page.evaluate(() =>
        window.__THREE_GAME_TEST_HOOKS__.setState('active-play')
      )
      await page.waitForTimeout(2000)
      const npc = (await diagnostics(page)).city.npcPlacements.hoa
        ?.position ?? [-23, 0, 3.5]
      const hit = await project(page, [npc[0], 1.2, npc[2]])
      await page.mouse.click(hit.x, hit.y)
      await page.locator('.conversation').waitFor({ timeout: 15000 })
      assert.match(await page.locator('.conversation').innerText(), /Hoa/)
      results.push({
        width,
        npcConversation: true,
        rightDrag: true,
        leftDragSuppressed: true,
      })
      await dismiss(page)
      await teleport(page, -23, 10)
      await page.waitForTimeout(1600)
      const resident = await page.evaluate(async () => {
        const url = performance
          .getEntriesByType('resource')
          .map((entry) => entry.name)
          .filter(
            (name) => new URL(name).pathname === '/src/shared/world/npc-pose.ts'
          )
          .at(-1)
        const { npcPoses } = await import(url)
        return npcPoses.get('market-walk')
      })
      assert(resident, 'moving resident has a rendered pose')
      const residentHit = await project(page, [resident[0], 1.2, resident[2]])
      await page.mouse.click(residentHit.x, residentHit.y)
      await page.locator('.conversation').waitFor({ timeout: 15000 })
      assert.match(await page.locator('.conversation h2').innerText(), /Dat/)
      results.push({ width, movingResidentConversation: true })
    } else {
      await page.touchscreen.tap(ground.x, ground.y)
      await page.waitForTimeout(900)
      const at = (await diagnostics(page)).state.position
      assert(Math.hypot(at[0] - start[0], at[2] - start[2]) < 0.5)
      const yaw = await page.evaluate(
        () => window.__THREE_GAME_TEST_HOOKS__.camera().yaw
      )
      const cdp = await context.newCDPSession(page)
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: 190, y: 400 }],
      })
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: 250, y: 400 }],
      })
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: [],
      })
      await cdp.detach()
      assert(
        Math.abs(
          (await page.evaluate(
            () => window.__THREE_GAME_TEST_HOOKS__.camera().yaw
          )) - yaw
        ) > 0.2
      )
      // Restore yaw so the existing joystick assertion measures northward travel.
      await page.evaluate(() =>
        window.__THREE_GAME_TEST_HOOKS__.setState('mobile-active-play')
      )
      await page.waitForTimeout(600)
      const { movePlayer } = await import('./qa-city-controls.mjs')
      await movePlayer(page, context, () => diagnostics(page), true)
      results.push({ width, tapIgnored: true, joystick: true, touchDrag: true })
    }
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      ),
      'no horizontal overflow'
    )
    await page.screenshot({ path: `${out}/verified-${width}.png` })
    assert.deepEqual(errors, [])
    await context.close()
  }
  await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results))
} finally {
  await browser.close()
}

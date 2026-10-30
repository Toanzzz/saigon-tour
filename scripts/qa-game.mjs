import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(
  `${process.env.QA_MODULE_ROOT || '/private/tmp/saigon-tour-qa'}/package.json`
)
const { chromium } = require('playwright')
const out = path.resolve(process.env.QA_OUTPUT || 'artifacts/pass-1')
await mkdir(out, { recursive: true })
const executablePath =
  process.env.CHROMIUM_PATH ||
  '/Users/toan/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: ['--enable-webgl'],
})
const mobile = process.env.QA_MODE === 'mobile'
const viewport = mobile
  ? { width: 390, height: 844 }
  : { width: 1440, height: 900 }
const recordVideo =
  process.env.QA_RECORD_VIDEO === '0'
    ? undefined
    : { dir: `${out}/video`, size: viewport }
const context = await browser.newContext({
  viewport,
  isMobile: mobile,
  hasTouch: mobile,
  deviceScaleFactor: 1,
  ...(recordVideo ? { recordVideo } : {}),
})
const page = await context.newPage()
const errors = []
const requests = []
page.on('pageerror', (error) => errors.push(error.message))
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text())
})
page.on('requestfailed', (request) =>
  requests.push({ url: request.url(), error: request.failure()?.errorText })
)
const diag = () => page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__)
const capture = async (name) => {
  await page.screenshot({ path: `${out}/${name}.png` })
  await writeFile(`${out}/${name}.json`, JSON.stringify(await diag(), null, 2))
}
try {
  await page.goto(process.env.GAME_URL || 'http://127.0.0.1:58000/?debug=1')
  await page
    .getByRole('button', { name: 'Start exploring', exact: true })
    .waitFor({ timeout: 45000 })
  let xrSessionSupported = null
  if (mobile) {
    assert.equal(
      await page.locator('body').evaluate((node) => node.scrollWidth),
      390,
      'mobile UI fits the viewport width'
    )
    xrSessionSupported = await page.evaluate(async () => {
      if (!navigator.xr) return false
      try {
        return await navigator.xr.isSessionSupported('immersive-vr')
      } catch {
        return false
      }
    })
    assert.equal(
      xrSessionSupported,
      false,
      'browser cannot start an immersive XR session'
    )
    assert.equal(
      await page.locator('.xr-session-button:visible').count(),
      0,
      'XR button stays hidden when immersive XR is unsupported'
    )
  }
  await page.waitForFunction(
    () => window.__THREE_GAME_DIAGNOSTICS__?.renderer?.render?.triangles > 1000
  )
  await page.waitForTimeout(1000)
  await capture('title')
  await page
    .getByRole('button', { name: 'Start exploring', exact: true })
    .click()
  await page.waitForTimeout(2000)
  if (mobile) {
    const stick = page.getByRole('group', { name: 'Movement joystick' })
    await stick.waitFor({ timeout: 5000 })
    const box = await stick.boundingBox()
    assert(box, 'mobile joystick is visible')
    const beforeTouch = await diag()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.15, {
      steps: 4,
    })
    await page.waitForTimeout(900)
    await page.mouse.up()
    await page.waitForTimeout(250)
    const afterTouch = await diag()
    assert(
      afterTouch.state.position[2] < beforeTouch.state.position[2] - 0.5,
      'touch joystick moves the player'
    )
    await page.waitForFunction(
      () =>
        document
          .querySelector('.stick-knob')
          ?.getAttribute('style')
          ?.includes('translate(0px, 0px)'),
      { timeout: 3000 }
    )
    const interact = page.locator('button.touch-interact')
    assert.equal(await interact.count(), 1, 'touch interaction target exists')
    await capture('mobile-active-play')
    await page.getByRole('button', { name: 'Open city hub' }).click()
    const hub = page.locator('dialog.hub-screen')
    await hub.waitFor()
    await hub.getByText('Active story').waitFor()
    assert.equal(
      await hub.evaluate((node) => node.scrollWidth - node.clientWidth),
      0,
      'hub fits 390px without horizontal overflow'
    )
    await capture('mobile-hub')
    await hub.evaluate((node) => node.scrollTo(0, node.scrollHeight))
    await page.waitForTimeout(200)
    await page.screenshot({ path: `${out}/mobile-hub-bottom.png` })
    await hub.getByRole('button', { name: 'Mute city sounds' }).click()
    await hub.getByRole('button', { name: 'Play city sounds' }).waitFor()
    await page.waitForFunction(
      () => window.__THREE_GAME_DIAGNOSTICS__?.state?.muted === true,
      { timeout: 3000 }
    )
    await hub.getByRole('button', { name: 'Close city hub' }).click()
    await hub.waitFor({ state: 'detached' })
    await writeFile(
      `${out}/mobile-checkpoint.json`,
      JSON.stringify(
        { beforeTouch, afterTouch, xrSessionSupported, errors, requests },
        null,
        2
      )
    )
  } else {
    await capture('desktop-active-play')
    const before = await diag()
    await page.keyboard.down('w')
    await page.waitForTimeout(1000)
    await page.keyboard.up('w')
    await page.waitForTimeout(300)
    const after = await diag()
    assert(
      after.state.position[2] < before.state.position[2] - 2,
      'W moves the player toward the market'
    )
    await page.keyboard.press('e')
    await page
      .getByRole('button', { name: 'Help Cô Hoa', exact: true })
      .waitFor({ timeout: 20000 })
    await page.getByRole('button', { name: 'Help Cô Hoa', exact: true }).click()
    await page.waitForFunction(
      () => Boolean(window.__THREE_GAME_DIAGNOSTICS__?.state?.quest),
      { timeout: 20000 }
    )
    await capture('dialogue-quest')
    await page.keyboard.press('Escape')
    await page.keyboard.down('s')
    await page.waitForTimeout(1100)
    await page.keyboard.up('s')
    await page.keyboard.down('d')
    await page.waitForTimeout(3000)
    await page.keyboard.up('d')
    await page.keyboard.down('s')
    await page.waitForTimeout(440)
    await page.keyboard.up('s')
    await page.keyboard.down('d')
    await page.waitForTimeout(250)
    await page.keyboard.up('d')
    await page.waitForTimeout(300)
    await capture('at-stop')
    await page.keyboard.press('e')
    await page.waitForTimeout(300)
    await capture('transport-menu')
    await page.getByRole('button', { name: /Board City bus/ }).click()
    await page.waitForFunction(
      () => window.__THREE_GAME_DIAGNOSTICS__?.state?.ride !== null
    )
    await capture('riding')
    await page.waitForFunction(
      () => window.__THREE_GAME_DIAGNOSTICS__?.state?.ride === null,
      { timeout: 20000 }
    )
    assert.equal(
      (await diag()).state.currency,
      25,
      'The bus charges exactly five coins'
    )
    await page.keyboard.down('d')
    await page.waitForTimeout(750)
    await page.keyboard.up('d')
    await page.keyboard.down('w')
    await page.waitForTimeout(1000)
    await page.keyboard.up('w')
    await page.waitForTimeout(200)
    await page.keyboard.press('e')
    await page
      .getByRole('button', { name: 'Deliver the herbs', exact: true })
      .waitFor({ timeout: 20000 })
    await page
      .getByRole('button', { name: 'Deliver the herbs', exact: true })
      .click()
    await page.locator('.speech.assistant').nth(1).waitFor({ timeout: 30000 })
    assert.equal(
      (await diag()).state.completed,
      0,
      'handing over the herbs alone grants no reward'
    )
    await capture('delivered-to-linh')
    await page.keyboard.press('Escape')
    // Back to Cô Hoa by bus; she verifies the delivery on the server.
    await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.teleport(-23, 6))
    await page.waitForFunction(
      () =>
        Math.abs(window.__THREE_GAME_DIAGNOSTICS__.state.position[0] + 23) <
        0.5,
      { timeout: 5000 }
    )
    await page.waitForTimeout(300)
    await page.keyboard.press('e')
    await page
      .getByRole('button', { name: 'Check my progress', exact: true })
      .click({ timeout: 30000 })
    await page
      .getByRole('heading', { name: 'A little kindness goes far.' })
      .waitFor({ timeout: 30000 })
    await page.waitForFunction(
      () => window.__THREE_GAME_DIAGNOSTICS__?.state?.completed === 1
    )
    assert.equal((await diag()).state.completed, 1)
    await capture('reward')
    await page
      .getByRole('button', { name: 'Continue exploring', exact: true })
      .click()
    const hub = page.locator('dialog.hub-screen')
    await hub.waitFor()
    await page.waitForTimeout(400)
    assert.equal((await diag()).state.screen, 'hub', 'hub opens after reward')
    assert.equal(
      await hub.locator('.wallet b').innerText(),
      String((await diag()).state.currency),
      'hub wallet mirrors game coins'
    )
    await hub.getByText('Story complete').waitFor()
    assert.equal(await hub.locator('.stop.done').count(), 3)
    await capture('hub-after-reward')
    await hub.getByRole('button', { name: 'Open journal' }).click()
    await page.getByRole('heading', { name: 'Your little journey' }).waitFor()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await page.keyboard.press('h')
    await hub.waitFor()
    await page.keyboard.press('Escape')
    await hub.waitFor({ state: 'detached' })
    await page.waitForFunction(
      () => window.__THREE_GAME_DIAGNOSTICS__?.state?.screen === 'playing',
      { timeout: 2000 }
    )
    await page.getByRole('button', { name: 'Pause game' }).click()
    await page
      .getByRole('button', { name: 'Start a new journey', exact: true })
      .click()
    await page.waitForTimeout(700)
    const restarted = await diag()
    assert.equal(restarted.state.currency, 30)
    assert.equal(restarted.state.completed, 0)
    assert(Math.abs(restarted.state.position[0] + 23) < 0.1)
    await writeFile(
      `${out}/flow-checkpoint.json`,
      JSON.stringify(
        {
          before,
          after,
          current: await diag(),
          text: await page.locator('body').innerText(),
          errors,
          requests,
        },
        null,
        2
      )
    )
  }
  assert.equal(errors.length, 0, errors.join('\n'))
} catch (error) {
  await page.screenshot({ path: `${out}/failure.png` }).catch(() => {})
  await writeFile(
    `${out}/failure.json`,
    JSON.stringify(
      {
        error: String(error),
        diagnostics: await diag(),
        text: await page.locator('body').innerText(),
        errors,
        requests,
      },
      null,
      2
    )
  )
  throw error
} finally {
  await context.close()
  await browser.close()
}

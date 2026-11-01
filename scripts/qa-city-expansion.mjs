import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { movePlayer } from './qa-city-controls.mjs'
import { verifyCityLife } from './qa-city-life.mjs'

const require = createRequire(
  `${process.env.QA_MODULE_ROOT || '/private/tmp/saigon-tour-qa'}/package.json`
)
const { chromium } = require('playwright')
const pass =
  process.argv.find((arg) => arg.startsWith('--pass='))?.split('=')[1] ||
  process.env.QA_PASS ||
  'baseline'
assert(['baseline', 'landmarks', 'life', 'complete'].includes(pass))
const out = path.resolve(
  process.env.QA_OUTPUT || `artifacts/city-expansion-${pass}`
)
await mkdir(out, { recursive: true })
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROMIUM_PATH ||
    '/Users/toan/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  args: ['--enable-webgl'],
})
const reports = []

async function verify(viewport) {
  const mobile = viewport.width === 390
  const label = mobile ? 'mobile' : 'desktop'
  const context = await browser.newContext({
    locale: 'en-US',
    viewport,
    isMobile: mobile,
    hasTouch: mobile,
    deviceScaleFactor: 1,
    recordVideo:
      process.env.QA_RECORD_VIDEO === '0'
        ? undefined
        : { dir: `${out}/video`, size: viewport },
  })
  const page = await context.newPage()
  const errors = []
  const requests = []
  const models = new Map()
  const captures = {}
  let life = null
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('requestfailed', (request) =>
    requests.push({ url: request.url(), error: request.failure()?.errorText })
  )
  page.on('response', (response) => {
    if (response.url().endsWith('.glb'))
      models.set(response.url().split('/models/')[1], response.status())
  })
  const diag = () => page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__)
  const capture = async (name) => {
    await page.waitForTimeout(700)
    captures[name] = await diag()
    await page.screenshot({ path: `${out}/${label}-${name}.png` })
  }
  const teleport = async (x, z) => {
    await page.evaluate(
      ([a, b]) => window.__THREE_GAME_TEST_HOOKS__.teleport(a, b),
      [x, z]
    )
    await page.waitForFunction(
      ([a, b]) => {
        const p = window.__THREE_GAME_DIAGNOSTICS__?.state?.position
        return p && Math.hypot(p[0] - a, p[2] - b) < 0.6
      },
      [x, z],
      { timeout: 5000 }
    )
    await page.waitForTimeout(800)
  }
  try {
    await page.goto(process.env.GAME_URL || 'http://127.0.0.1:58000/?debug=1')
    await page
      .getByRole('button', { name: 'Start exploring', exact: true })
      .click({ timeout: 60000 })
    await page.waitForFunction(
      () =>
        window.__THREE_GAME_DIAGNOSTICS__?.renderer?.render?.triangles > 1000
    )
    await page.waitForTimeout(1500)
    assert.equal(
      await page.locator('body').evaluate((node) => node.scrollWidth),
      viewport.width,
      'UI fits the viewport'
    )
    const before = await movePlayer(page, context, diag, mobile)
    await capture('active-play')
    await page.getByRole('button', { name: 'Open neighborhood map' }).click()
    await page
      .getByRole('heading', { name: 'A city of small stories' })
      .waitFor()
    const mapText = await page.locator('dialog').innerText()
    assert(mapText.includes('BẾN THÀNH'))
    if (pass !== 'baseline') {
      for (const label of [
        'NHÀ HÁT THÀNH PHỐ',
        'BƯU ĐIỆN TRUNG TÂM',
        'HẺM ẨM THỰC',
      ])
        assert(mapText.includes(label), `map labels ${label}`)
      assert.equal(
        await page.locator('dialog svg circle[fill="#ee7448"]').count(),
        8,
        'map shows eight transport stops'
      )
    }
    await capture('map')
    await page.getByRole('button', { name: 'Close panel', exact: true }).click()

    // Teleports only position the player; rides and discovery use real controls.
    await teleport(-10, 12)
    if (mobile) await page.locator('button.touch-interact').click()
    else await page.keyboard.press('e')
    await page.getByLabel('Destination').selectOption('cathedral')
    const wallet = (await diag()).state.currency
    await page.getByRole('button', { name: /Board City bus/ }).click()
    await page.waitForFunction(
      () => window.__THREE_GAME_DIAGNOSTICS__?.state?.ride !== null
    )
    const started = performance.now()
    await capture('riding')
    await page.waitForFunction(
      () => window.__THREE_GAME_DIAGNOSTICS__?.state?.ride === null,
      null,
      { timeout: 45000 }
    )
    const rideSeconds = (performance.now() - started) / 1000
    await page.waitForTimeout(700)
    const arrived = await diag()
    assert.equal(arrived.state.currency, wallet - 5, 'bus charges five coins')
    assert(
      Math.hypot(
        arrived.state.position[0] - 89.8,
        arrived.state.position[2] + 58
      ) < 2,
      'bus reaches cathedral stop'
    )
    await teleport(88, -64)
    await capture('cathedral')
    await teleport(69, 0)
    await capture('cityhall')

    if (pass !== 'baseline') {
      for (const model of [
        'landmarks/nha-tho-duc-ba-statue.glb',
        'landmarks/toa-thi-chinh-statue.glb',
      ])
        assert.equal(models.get(model), 200, `${model} loads`)
      await teleport(90, -35)
      const canvas = await page.locator('canvas').first().boundingBox()
      assert(canvas)
      const from = {
        x: canvas.x + canvas.width / 2 - 112,
        y: canvas.y + canvas.height / 2,
      }
      await page.mouse.move(from.x, from.y)
      await page.mouse.down()
      await page.mouse.move(from.x + 224, from.y, { steps: 12 })
      await page.mouse.up()
      await capture('opera')
      await teleport(99, -84)
      await capture('postoffice')
      await page.mouse.move(from.x + 224, from.y)
      await page.mouse.down()
      await page.mouse.move(from.x, from.y, { steps: 12 })
      await page.mouse.up()
      await teleport(100, -74)
      if (mobile) await page.locator('button.touch-interact').click()
      else await page.keyboard.press('e')
      await page.getByLabel('Destination').selectOption('opera')
      const secondWallet = (await diag()).state.currency
      await page.getByRole('button', { name: /Board City bus/ }).click()
      await page.waitForFunction(
        () => window.__THREE_GAME_DIAGNOSTICS__?.state?.ride !== null
      )
      await page.waitForFunction(
        () => window.__THREE_GAME_DIAGNOSTICS__?.state?.ride === null,
        null,
        { timeout: 20000 }
      )
      const secondArrival = await diag()
      assert.equal(secondArrival.state.currency, secondWallet - 5)
      assert(
        Math.hypot(
          secondArrival.state.position[0] - 89.8,
          secondArrival.state.position[2] + 35
        ) < 2,
        'new Opera stop is reachable'
      )
      await capture('opera-stop')
      await teleport(-25, 25)
      await capture('alley')
    }
    if (pass === 'life' || pass === 'complete')
      life = await verifyCityLife({
        page,
        diag,
        teleport,
        capture,
        mobile,
      })
    assert.deepEqual(errors, [], 'no page or console errors')
    assert.deepEqual(requests, [], 'no failed requests')
    const report = {
      pass,
      viewport,
      rideSeconds,
      before,
      arrived,
      mapText,
      captures,
      life,
      models: Object.fromEntries(models),
      errors,
      requests,
    }
    await writeFile(
      `${out}/${label}.json`,
      `${JSON.stringify(report, null, 2)}\n`
    )
    reports.push(report)
    console.log(
      `${label} ${pass}: movement/map/bus passed; ride ${rideSeconds.toFixed(1)}s; ` +
        `${captures['active-play'].renderer.render.calls} calls / ` +
        `${captures['active-play'].renderer.render.triangles} triangles`
    )
  } catch (error) {
    await page
      .screenshot({ path: `${out}/${label}-failure.png` })
      .catch(() => {})
    await writeFile(
      `${out}/${label}-failure.json`,
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
  }
}
try {
  await verify({ width: 1440, height: 900 })
  await verify({ width: 390, height: 844 })
  await writeFile(
    `${out}/report.json`,
    `${JSON.stringify(
      reports.map((r) => ({
        pass: r.pass,
        viewport: r.viewport,
        rideSeconds: r.rideSeconds,
        captures: Object.fromEntries(
          Object.entries(r.captures).map(([name, d]) => [
            name,
            {
              renderer: d.renderer,
              fps: d.fps,
              physics: d.physics,
            },
          ])
        ),
        errors: r.errors,
        requests: r.requests,
      })),
      null,
      2
    )}\n`
  )
} finally {
  await browser.close()
}

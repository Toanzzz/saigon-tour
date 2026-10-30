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
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  recordVideo: { dir: `${out}/video`, size: { width: 1440, height: 900 } },
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
  await page.waitForFunction(
    () => window.__THREE_GAME_DIAGNOSTICS__?.renderer?.render?.triangles > 1000
  )
  await page.waitForTimeout(1000)
  await capture('title')
  await page
    .getByRole('button', { name: 'Start exploring', exact: true })
    .click()
  await page.waitForTimeout(2000)
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
  await page
    .getByRole('heading', { name: 'A little kindness goes far.' })
    .waitFor()
  await page.waitForFunction(
    () => window.__THREE_GAME_DIAGNOSTICS__?.state?.completed === 1
  )
  assert.equal((await diag()).state.completed, 1)
  await capture('reward')
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

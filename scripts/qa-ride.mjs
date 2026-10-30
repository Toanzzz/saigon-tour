import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'

const require = createRequire(
  `${process.env.QA_MODULE_ROOT || '/private/tmp/saigon-tour-qa'}/package.json`
)
const { chromium } = require('playwright')
const out = process.env.QA_OUTPUT || '/tmp/saigon-ride'
await mkdir(out, { recursive: true })
const browser = await chromium.launch({
  headless: true,
  executablePath:
    '/Users/toan/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  args: ['--enable-webgl'],
})
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
const diag = () => page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__.state)
await page.goto('http://127.0.0.1:58000/?debug=1')
await page
  .getByRole('button', { name: 'Start exploring', exact: true })
  .waitFor({ timeout: 60000 })
await page.evaluate(() =>
  window.__THREE_GAME_TEST_HOOKS__.setState('transport')
)
await page.waitForTimeout(500)
await page.getByLabel('Destination').selectOption({ label: 'Nhà thờ Đức Bà' })
await page.getByRole('button', { name: /Board City bus/ }).click()
const t0 = Date.now()
await page.waitForFunction(
  () => window.__THREE_GAME_DIAGNOSTICS__?.state?.ride !== null
)
await page.waitForTimeout(3000)
await page.screenshot({ path: `${out}/ride-mid.png` })
await page.waitForFunction(
  () => window.__THREE_GAME_DIAGNOSTICS__?.state?.ride === null,
  null,
  { timeout: 40000 }
)
const seconds = (Date.now() - t0) / 1000
await page.waitForTimeout(600)
const after = await diag()
await page.screenshot({ path: `${out}/ride-arrive.png` })
assert.equal(after.currency, 25)
assert(
  Math.hypot(after.position[0] - 89.8, after.position[2] + 58) < 3,
  `arrived ${after.position}`
)
await page.keyboard.down('w')
await page.waitForTimeout(2500)
await page.keyboard.up('w')
await page.waitForTimeout(300)
const walked = await diag()
await page.screenshot({ path: `${out}/ride-walk.png` })
console.log(
  JSON.stringify({
    seconds,
    after: after.position,
    walked: walked.position,
    errors,
  })
)
assert.deepEqual(errors, [])
await browser.close()

import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'

const require = createRequire('/private/tmp/saigon-tour-qa/package.json')
const { chromium } = require('playwright')
const out = process.env.QA_OUTPUT || '/tmp/sgdesign/hub'
const url = process.env.HUB_URL || 'http://127.0.0.1:58006/'
await mkdir(out, { recursive: true })
const browser = await chromium.launch({
  headless: true,
  executablePath:
    '/Users/toan/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
})
const results = {}
for (const mode of ['desktop', 'mobile']) {
  const mobile = mode === 'mobile'
  const context = await browser.newContext({
    viewport: mobile
      ? { width: 390, height: 844 }
      : { width: 1440, height: 900 },
    isMobile: mobile,
    hasTouch: mobile,
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await page.goto(url)
  await page.getByRole('heading', { name: 'Chào Mai!' }).waitFor()
  await page.evaluate(() => document.fonts.ready)
  const fonts = await page.evaluate(() => ({
    display: document.fonts.check('800 40px "Baloo 2 Variable"', 'Chào'),
    body: document.fonts.check('400 16px "Be Vietnam Pro"', 'Chị'),
  }))
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  )
  await page.screenshot({ path: `${out}/${mode}.png`, fullPage: true })

  const nav = page.getByRole('navigation', {
    name: mobile ? 'Mobile hub sections' : 'Hub sections',
  })
  await nav.getByRole('button', { name: 'Neighbors' }).click()
  assert.equal(
    await nav
      .getByRole('button', { name: 'Neighbors' })
      .getAttribute('aria-current'),
    'page'
  )
  await page.getByRole('button', { name: 'Công viên' }).click()
  await page
    .getByRole('status')
    .filter({ hasText: 'Công viên selected.' })
    .waitFor()
  await page.getByRole('button', { name: 'Talk to Cô Hoa' }).click()
  await page
    .getByRole('status')
    .filter({ hasText: 'Conversation reopened with Cô Hoa.' })
    .waitFor()
  await page.getByRole('button', { name: 'Play city sounds' }).click()
  await page.getByRole('button', { name: 'Pause city sounds' }).waitFor()
  await page.getByRole('heading', { name: 'Playing' }).waitFor()
  await page.screenshot({ path: `${out}/${mode}-after.png` })
  results[mode] = { fonts, overflow, errors }
  assert.deepEqual(errors, [])
  assert.ok(overflow <= 0, `horizontal overflow ${overflow}px`)
  assert.ok(fonts.display && fonts.body, 'fonts loaded')
  await context.close()
}
await browser.close()
await writeFile(`${out}/check.json`, JSON.stringify(results, null, 2))
console.log(JSON.stringify(results))

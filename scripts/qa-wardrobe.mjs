import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'

const require = createRequire(
  `${process.env.QA_MODULE_ROOT || '/private/tmp/saigon-tour-qa'}/package.json`
)
const { chromium } = require('playwright')
const out = process.env.QA_OUTPUT || 'artifacts/wardrobe'
const url = process.env.GAME_URL || 'http://127.0.0.1:58000/'
await mkdir(out, { recursive: true })
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROMIUM_PATH ||
    '/Users/toan/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell',
})
const errors = []
const results = []
const garments = [
  'apron',
  'ao-ba-ba',
  'barista',
  'photo-vest',
  'evening',
  'ao-dai',
]
const imageHash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const animationSnapshot = (page) =>
  page.evaluate(async () => {
    const { _roots } = await import(
      '/node_modules/.vite/deps/@react-three_fiber.js'
    )
    const state = [..._roots.values()][0].store.getState()
    const actors = []
    state.scene.traverse((object) => {
      if (object.userData.activeAnimation)
        actors.push({
          clip: object.userData.activeAnimation,
          time: object.userData.animationTime,
        })
    })
    return actors
  })
try {
  for (const [body, width] of [
    ['man', 1440],
    ['woman', 390],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      locale: 'en-US',
      isMobile: width === 390,
      hasTouch: width === 390,
    })
    const page = await context.newPage()
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(`${url}?wardrobeDebug&body=${body}`)
    const canvas = page.locator('.workshop-fitting canvas')
    await canvas.waitFor({ state: 'visible' })
    await page.locator('.wardrobe-preview-loading').waitFor({ state: 'hidden' })
    await page.getByLabel('Character body', { exact: true }).selectOption(body)
    assert.equal(
      await page.locator('canvas').count(),
      1,
      'one live fitting canvas'
    )
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1
      ),
      'no horizontal overflow'
    )
    const equip = async (id) => {
      const card = page
        .locator('.wardrobe-card')
        .filter({ has: page.locator(`img[src$="/${id}.webp"]`) })
      await card.getByRole('button', { name: 'Equip', exact: true }).click()
      await page
        .locator('.wardrobe-preview-loading')
        .waitFor({ state: 'hidden' })
      await page.waitForTimeout(250)
      await canvas.scrollIntoViewIfNeeded()
    }
    const captured = []
    for (const id of garments) {
      await equip(id)
      await page.getByLabel('Animation', { exact: true }).selectOption('walk')
      await page.getByLabel('Freeze animation', { exact: true }).uncheck()
      await page.waitForTimeout(450)
      const walkBefore = await animationSnapshot(page)
      const before = imageHash(await canvas.screenshot())
      await page.waitForTimeout(450)
      const after = imageHash(await canvas.screenshot())
      assert.notEqual(before, after, `${body}/${id} walk animates`)
      const walkAfter = await animationSnapshot(page)
      assert(
        walkBefore.some((actor) => actor.clip === 'walk'),
        `${body}/${id} uses walk clip`
      )
      assert.notDeepEqual(
        walkBefore,
        walkAfter,
        `${body}/${id} animation clock advances`
      )
      await page.getByLabel('Freeze animation', { exact: true }).check()
      await page.getByLabel('Animation', { exact: true }).selectOption('sit')
      await page.waitForTimeout(250)
      const frozen = await animationSnapshot(page)
      await page.waitForTimeout(250)
      assert.deepEqual(
        await animationSnapshot(page),
        frozen,
        `${body}/${id} frozen pose stays stable`
      )
      await page.getByLabel('Animation', { exact: true }).selectOption('sprint')
      await page.getByLabel('Freeze animation', { exact: true }).uncheck()
      await page.waitForTimeout(350)
      await page.getByLabel('View', { exact: true }).selectOption('side')
      await page.waitForTimeout(300)
      await canvas.screenshot({ path: `${out}/${body}-${id}-run-side.png` })
      captured.push(id)
      await page.getByLabel('View', { exact: true }).selectOption('front')
    }
    await page
      .getByRole('button', { name: 'Clear outfit', exact: true })
      .click()
    await equip('ao-dai')
    await equip('bucket-hat')
    await equip('headphones')
    await page.getByLabel('Animation', { exact: true }).selectOption('idle')
    await page.waitForTimeout(350)
    await canvas.screenshot({ path: `${out}/${body}-combo-front.png` })
    await page.getByLabel('View', { exact: true }).selectOption('back')
    await page.waitForTimeout(350)
    await canvas.screenshot({ path: `${out}/${body}-combo-back.png` })
    for (const ride of ['bicycle', 'basket-bicycle', 'cub', 'vespa']) {
      await equip(ride)
      await page.getByLabel('View', { exact: true }).selectOption('side')
      await page.waitForTimeout(450)
      await canvas.screenshot({ path: `${out}/${body}-${ride}-side.png` })
    }
    await page
      .getByRole('button', { name: 'Clear outfit', exact: true })
      .click()
    for (const pet of ['dog', 'bunny', 'cat', 'parrot', 'chick']) {
      await equip(pet)
      await page.getByLabel('Animation', { exact: true }).selectOption('walk')
      await page.waitForTimeout(300)
    }
    assert.equal(await page.locator('[role="alert"]').count(), 0)
    results.push({
      body,
      width,
      garments: captured,
      rides: 4,
      pets: 5,
      liveCanvases: 1,
    })
    await context.close()
  }
  assert.deepEqual(errors, [], 'no browser exceptions')
  await writeFile(
    `${out}/motion-qa.json`,
    JSON.stringify({ results, errors }, null, 2)
  )
  console.log('WARDROBE_MOTION_QA_OK', JSON.stringify(results))
} finally {
  await browser.close()
}

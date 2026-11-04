import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import sharp from 'sharp'

const require = createRequire(
  `${process.env.QA_MODULE_ROOT || '/private/tmp/saigon-tour-qa'}/package.json`
)
const { chromium } = require('playwright')
const out = process.env.QA_OUTPUT || 'artifacts/rare-wearables'
const origin = process.env.GAME_URL || 'http://127.0.0.1:58000/'
await mkdir(out, { recursive: true })
const items = ['lacquer-non-la', 'silk-scarf', 'festival-ao-dai']
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROMIUM_PATH ||
    '/Users/toan/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell',
})
const results = [],
  errors = []
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')

async function animationState(page) {
  return page.evaluate(async () => {
    const { _roots } = await import(
      '/node_modules/.vite/deps/@react-three_fiber.js'
    )
    const scene = [..._roots.values()][0].store.getState().scene
    const actors = [],
      attachments = []
    scene.traverse((object) => {
      if (object.userData.activeAnimation)
        actors.push({
          clip: object.userData.activeAnimation,
          time: object.userData.animationTime,
        })
      if (object.userData.cosmeticId)
        attachments.push({
          id: object.userData.cosmeticId,
          parent: object.parent.name,
        })
    })
    return { actors, attachments }
  })
}

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
    await page.goto(`${origin}?wardrobeDebug&body=${body}`)
    const canvas = page.locator('.workshop-fitting canvas')
    await canvas.waitFor({ state: 'visible', timeout: 120000 })
    await page.locator('.wardrobe-preview-loading').waitFor({ state: 'hidden' })
    assert.equal(await page.locator('canvas').count(), 1)
    const fits = () =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1
      )
    assert(await fits(), 'no horizontal overflow')
    const equip = async (id) => {
      const card = page
        .locator('.wardrobe-card')
        .filter({ has: page.locator(`img[src$="/${id}.webp"]`) })
      await card.getByRole('button', { name: 'Equip', exact: true }).click()
      await page
        .locator('.wardrobe-preview-loading')
        .waitFor({ state: 'hidden' })
      await canvas.scrollIntoViewIfNeeded()
      await page.waitForTimeout(400)
    }
    for (const id of items) {
      await page
        .getByRole('button', { name: 'Clear outfit', exact: true })
        .click()
      await equip(id)
      for (const gait of ['idle', 'walk', 'sprint', 'sit']) {
        await page.getByLabel('Animation', { exact: true }).selectOption(gait)
        await page.getByLabel('Freeze animation', { exact: true }).uncheck()
        await page.waitForTimeout(300)
        const before = await animationState(page)
        const first = hash(await canvas.screenshot())
        await page.waitForTimeout(250)
        const after = await animationState(page)
        const bytes = await canvas.screenshot()
        assert.notDeepEqual(
          before.actors,
          after.actors,
          `${body}/${id}/${gait}: animation clock advances`
        )
        assert(
          after.actors.some((actor) => actor.clip === gait),
          `${body}/${id}/${gait}: selected clip plays`
        )
        if (gait === 'walk' || gait === 'sprint')
          assert.notEqual(first, hash(bytes), 'animated rendering changes')
        if (id !== 'festival-ao-dai')
          assert(
            after.attachments.some((entry) => entry.id === id),
            'cosmetic attaches to its bone'
          )
        const pixels = await sharp(bytes).stats()
        assert(
          pixels.channels.some((channel) => channel.stdev > 12),
          'nonblank canvas'
        )
        await writeFile(`${out}/${body}-${id}-${gait}.png`, bytes)
        results.push({ body, width, id, gait, ...after })
      }
    }
    await equip('lacquer-non-la')
    await equip('silk-scarf')
    await equip('bicycle')
    await page.getByLabel('View', { exact: true }).selectOption('side')
    await page.waitForTimeout(450)
    const riding = await animationState(page)
    for (const id of ['lacquer-non-la', 'silk-scarf'])
      assert(riding.attachments.some((entry) => entry.id === id))
    assert(riding.actors.some((actor) => actor.clip === 'drive'))
    await canvas.screenshot({ path: `${out}/${body}-combo-driving.png` })
    results.push({ body, width, gait: 'drive', ...riding })
    assert.equal(await page.locator('[role="alert"]').count(), 0)
    assert(await fits(), 'no horizontal overflow after equipping')
    await context.close()
  }
  assert.deepEqual(errors, [])
  await writeFile(
    `${out}/motion-qa.json`,
    JSON.stringify({ results, errors }, null, 2)
  )
  console.log('RARE_WEARABLES_QA_OK', results.length)
} finally {
  await browser.close()
}

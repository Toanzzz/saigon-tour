import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import sharp from 'sharp'
import { UNLOCKS } from '../packages/shared/src/unlocks'

const require = createRequire(
  `${process.env.QA_MODULE_ROOT || '/private/tmp/saigon-tour-qa'}/package.json`
)
const { chromium } = require('playwright')
const origin = process.env.GAME_URL || 'http://127.0.0.1:58000/'
const root = resolve(import.meta.dirname, '..')
const runtime = resolve(root, 'apps/client/public/images/wardrobe')
const evidence = resolve(root, 'artifacts/wardrobe')
const selected = new Set(process.env.WARDROBE_ITEMS?.split(',').filter(Boolean))
await mkdir(evidence, { recursive: true })
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROMIUM_PATH ||
    '/Users/toan/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell',
})
const records: { body: string; id: string; width: number; height: number }[] =
  []
try {
  const page = await browser.newPage({
    viewport: { width: 700, height: 700 },
    locale: 'en-US',
  })
  const errors: string[] = []
  page.on('pageerror', (error: Error) => errors.push(error.message))
  for (const body of ['man', 'woman']) {
    await mkdir(resolve(runtime, body), { recursive: true })
    const composites: sharp.OverlayOptions[] = []
    let index = 0
    for (const item of Object.values(UNLOCKS)) {
      const target = resolve(runtime, body, `${item.id}.webp`)
      if (!selected.size || selected.has(item.id)) {
        const url = new URL(origin)
        url.search = new URLSearchParams({
          wardrobeDebug: '',
          body,
          item: item.id,
          capture: '1',
          view: item.id === 'lantern-backpack' ? 'back' : 'front',
        }).toString()
        await page.goto(url.href)
        const canvas = page.locator(
          '.workshop-capture .wardrobe-stage-view canvas'
        )
        await canvas.waitFor({ state: 'visible' })
        await page
          .locator('.wardrobe-preview-loading')
          .waitFor({ state: 'hidden' })
        await page.waitForTimeout(700)
        await page
          .locator('.wardrobe-stage button')
          .evaluate((button: HTMLButtonElement) => {
            button.click()
            button.click()
          })
        await page.waitForTimeout(200)
        assert.equal(
          await page.locator('[role="alert"]').count(),
          0,
          `${body}/${item.id} failed to render`
        )
        let image = await canvas.screenshot()
        let pixels = await sharp(image).stats()
        for (
          let retry = 0;
          !pixels.channels.some((channel) => channel.stdev > 12) && retry < 3;
          retry++
        ) {
          await page.waitForTimeout(1000)
          image = await canvas.screenshot()
          pixels = await sharp(image).stats()
        }
        assert(
          pixels.channels.some((channel) => channel.stdev > 12),
          `${body}/${item.id} is blank`
        )
        await sharp(image).resize(256, 256).webp({ quality: 90 }).toFile(target)
        console.log('RENDERED', body, item.id)
      }
      const thumb = await sharp(target).resize(190, 190).png().toBuffer()
      const label = Buffer.from(
        `<svg width="200" height="35"><rect width="200" height="35" fill="#fff6d8"/><text x="100" y="22" text-anchor="middle" font-size="14" font-family="sans-serif" fill="#292b3b">${item.id}</text></svg>`
      )
      composites.push({
        input: thumb,
        left: (index % 6) * 200 + 5,
        top: Math.floor(index / 6) * 230,
      })
      composites.push({
        input: label,
        left: (index % 6) * 200,
        top: Math.floor(index / 6) * 230 + 190,
      })
      records.push({ body, id: item.id, width: 256, height: 256 })
      index++
    }
    await sharp({
      create: {
        width: 1200,
        height: Math.ceil(index / 6) * 230,
        channels: 4,
        background: '#fff6d8',
      },
    })
      .composite(composites)
      .png()
      .toFile(resolve(evidence, `catalog-${body}.png`))
  }
  assert.deepEqual(
    errors,
    [],
    'no browser exceptions while rendering the complete catalog'
  )
  await writeFile(
    resolve(evidence, 'thumbnails.json'),
    JSON.stringify({ records, errors }, null, 2)
  )
  console.log('WARDROBE_THUMBNAILS_OK', records.length)
} finally {
  await browser.close()
}

import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium, executablePath } from './qa-quest-flow.mjs'

const browser = await chromium.launch({ headless: true, executablePath })
const results = []
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({
      viewport: { width, height: 900 },
      locale: 'en-US',
    })
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.route('**/images/wardrobe/man/non-la.webp', (route) =>
      route.fulfill({ status: 503, body: 'Temporary preview failure' })
    )
    await page.goto('http://127.0.0.1:58000/?wardrobeDebug')
    const hat = page
      .locator('.wardrobe-card')
      .filter({ has: page.getByText('nón lá hat', { exact: true }) })
    await hat.scrollIntoViewIfNeeded()
    await hat.getByRole('alert').waitFor()
    assert((await hat.innerText()).includes('Preview unavailable'))
    await page.unroute('**/images/wardrobe/man/non-la.webp')
    await hat.getByRole('button', { name: 'Try again', exact: true }).click()
    await page.waitForFunction(() => {
      const img = document.querySelector('img[src$="/man/non-la.webp"]')
      return img?.complete && img.naturalWidth === 256
    })
    assert.equal(await hat.getByRole('alert').count(), 0)
    assert.deepEqual(errors, [])
    await page.route('**/models/people/player-man.glb', (route) =>
      route.fulfill({ status: 503, body: 'Temporary model failure' })
    )
    await page.reload()
    await page.locator('.wardrobe-preview-error').waitFor()
    await page.unroute('**/models/people/player-man.glb')
    await page
      .locator('.wardrobe-preview-error')
      .getByRole('button', { name: 'Try again', exact: true })
      .click()
    await page.waitForSelector('.wardrobe-stage-view canvas')
    await page.locator('.wardrobe-preview-loading').waitFor({ state: 'hidden' })
    assert.equal(await page.locator('.wardrobe-preview-error').count(), 0)
    assert(errors.every((error) => error.includes('player-man.glb')))
    results.push({
      width,
      errorShown: true,
      retryRecovered: true,
      modelRetryRecovered: true,
      expectedModelError: errors.every((error) =>
        error.includes('player-man.glb')
      ),
      errors,
    })
    await page.close()
  }
  await mkdir('artifacts/quest-completion/thumbnail-errors', {
    recursive: true,
  })
  await writeFile(
    'artifacts/quest-completion/thumbnail-errors/results.json',
    JSON.stringify(results, null, 2)
  )
  console.log('THUMBNAIL_FAILURE_QA_OK', JSON.stringify(results))
} finally {
  await browser.close()
}

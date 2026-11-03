import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { extname, resolve } from 'node:path'
import { chromium, executablePath } from './qa-quest-flow.mjs'

const dist = resolve('apps/client/dist')
const out = 'artifacts/quest-completion/production'
await mkdir(out, { recursive: true })
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.glb': 'model/gltf-binary',
  '.wasm': 'application/wasm',
  '.mp3': 'audio/mpeg',
}
const browser = await chromium.launch({ headless: true, executablePath })
const results = []
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      locale: 'en-US',
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.route('**/*', async (route) => {
      const url = new URL(route.request().url())
      if (url.pathname.startsWith('/api/') || url.port === '58001')
        return route.abort()
      const path = resolve(
        dist,
        `.${decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)}`
      )
      if (!path.startsWith(`${dist}/`)) return route.abort()
      try {
        await route.fulfill({
          status: 200,
          contentType: types[extname(path)] ?? 'application/octet-stream',
          body: await readFile(path),
        })
      } catch {
        await route.fulfill({ status: 404, body: 'Not found' })
      }
    })
    for (const flag of ['questDebug', 'wardrobeDebug']) {
      await page.goto(`http://127.0.0.1:58000/?${flag}`)
      await page
        .getByRole('button', { name: 'Start exploring', exact: true })
        .waitFor({ timeout: 45000 })
      assert.equal(await page.locator('.workshop').count(), 0)
      assert.equal(await page.locator('.dev-workshop-links').count(), 0)
      await page.screenshot({ path: `${out}/${flag}-${width}.png` })
    }
    assert.deepEqual(errors, [])
    results.push({ width, debugExcluded: true, errors })
    await context.close()
  }
  await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2))
  console.log('PRODUCTION_DEBUG_QA_OK', JSON.stringify(results))
} finally {
  await browser.close()
}

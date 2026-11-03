import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import {
  chromium,
  diagnostics,
  executablePath,
  openGame,
  teleport,
} from './qa-quest-flow.mjs'

const out = process.env.QA_OUTPUT || 'artifacts/demo-perf'
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ headless: false, executablePath })
try {
  const page = await browser.newPage({
    locale: 'en-US',
    viewport: { width: 1440, height: 900 },
  })
  await openGame(page)
  const gpu = await page.evaluate(() => {
    const gl = document.querySelector('canvas').getContext('webgl2')
    const extension = gl.getExtension('WEBGL_debug_renderer_info')
    return extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : null
  })
  assert(
    gpu && !/swiftshader|llvmpipe|software/i.test(gpu),
    `hardware GPU required: ${gpu}`
  )
  const samples = []
  for (const [name, x, z, moving] of [
    ['market', -23, 7, false],
    ['park', 24, -2, false],
    ['alley', -24, 28, false],
    ['walking', -10, 15, true],
  ]) {
    await teleport(page, x, z)
    await page.waitForTimeout(1500)
    if (moving) await page.keyboard.down('w')
    const times = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const frames = []
          let last = 0
          const start = performance.now()
          const tick = (now) => {
            if (last) frames.push(now - last)
            last = now
            if (now - start >= 5000) resolve(frames)
            else requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
        })
    )
    if (moving) await page.keyboard.up('w')
    const sorted = times.toSorted((a, b) => a - b)
    const mean = times.reduce((a, b) => a + b, 0) / times.length
    const data = await diagnostics(page)
    samples.push({
      name,
      frames: times.length,
      meanFps: 1000 / mean,
      medianMs: sorted[Math.floor(sorted.length * 0.5)],
      p95Ms: sorted[Math.floor(sorted.length * 0.95)],
      calls: data.renderer.render.calls,
      triangles: data.renderer.render.triangles,
    })
  }
  const result = {
    gpu,
    browser: await browser.version(),
    viewport: [1440, 900],
    samples,
  }
  await writeFile(`${out}/results.json`, JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result))
} finally {
  await browser.close()
}

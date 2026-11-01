import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { homedir, tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const browserModule = process.env.PLAYWRIGHT_MODULE
if (!browserModule)
  throw new Error(
    'Set PLAYWRIGHT_MODULE to the scratch Playwright index.mjs path.'
  )
const { chromium } = await import(pathToFileURL(resolve(browserModule)).href)
const repository = fileURLToPath(new URL('../', import.meta.url))
const scratch = mkdtempSync(resolve(tmpdir(), 'saigon-audio-'))
execFileSync(
  'bun',
  [
    'build',
    resolve(repository, 'apps/client/src/audio/index.ts'),
    '--target',
    'browser',
    '--define',
    'import.meta.env.BASE_URL="/"',
    '--outfile',
    resolve(scratch, 'audio.js'),
  ],
  { cwd: repository }
)

const root = resolve(repository, 'apps/client/public')
const html = `<!doctype html><html><body><button id="start">Start sound</button><button id="pause">Pause</button><button id="resume">Resume</button><button id="mute">Mute</button><button id="dispose">Reset</button><button id="click">Confirm</button><button id="pickup">Pickup</button><button id="board">Board</button><button id="arrive">Arrive</button><button id="reward">Reward</button><output id="state">locked</output><script type="module">import {audio} from '/audio.js'; window.audio=audio; start.onclick=async()=>{await audio.unlock(); state.textContent='ready'}; pause.onclick=()=>audio.setPaused(true); resume.onclick=()=>audio.setPaused(false); mute.onclick=()=>audio.setMuted(!audio.stats().muted); dispose.onclick=()=>audio.dispose(); for(const id of ['click','pickup','board','arrive','reward']) document.getElementById(id).onclick=()=>audio.play(id);</script></body></html>`
const server = createServer((req, res) => {
  try {
    let body
    if (req.url === '/audio.js') {
      body = readFileSync(resolve(scratch, 'audio.js'))
      res.setHeader('Content-Type', 'text/javascript')
    } else if (req.url.startsWith('/audio/')) {
      body = readFileSync(root + req.url)
      res.setHeader('Content-Type', 'audio/mpeg')
    } else {
      body = html
      res.setHeader('Content-Type', 'text/html')
    }
    res.end(body)
  } catch {
    res.writeHead(404)
    res.end()
  }
})
await new Promise((resolve) => server.listen(58009, '127.0.0.1', resolve))
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM ||
    resolve(
      homedir(),
      'Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell'
    ),
})
const context = await browser.newContext({ locale: 'en-US' })
const page = await context.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
try {
  await page.goto('http://127.0.0.1:58009')
  const stats = () => page.evaluate(() => window.audio.stats())
  assert.equal((await stats()).state, 'locked')
  await page.getByRole('button', { name: 'Start sound', exact: true }).click()
  await page.waitForFunction(() => window.audio.stats().loaded.length === 4)
  const initial = await stats()
  assert.equal(initial.state, 'running')
  assert.equal(initial.ambienceLoops, 1)
  assert.deepEqual(initial.errors, [])
  for (const event of ['click', 'pickup', 'board', 'arrive', 'reward'])
    await page.locator(`#${event}`).click()
  const played = await stats()
  for (const event of ['click', 'pickup', 'board', 'arrive', 'reward'])
    assert.equal(played.events[event], 1)
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await page.waitForFunction(() => window.audio.stats().state === 'suspended')
  const paused = await stats()
  assert.equal(paused.ambienceLoops, 0)
  assert.equal(paused.activeEffects, 0)
  await page.getByRole('button', { name: 'Resume', exact: true }).click()
  await page.waitForFunction(() => window.audio.stats().state === 'running')
  await page.getByRole('button', { name: 'Resume', exact: true }).click()
  assert.equal((await stats()).ambienceLoops, 1)
  await page.getByRole('button', { name: 'Mute', exact: true }).click()
  assert.equal((await stats()).muted, true)
  await page.evaluate(() => window.audio.setVolume(0.25))
  assert.equal((await stats()).volume, 0.25)
  await page.getByRole('button', { name: 'Reset', exact: true }).click()
  const reset = await stats()
  assert.equal(reset.state, 'locked')
  assert.equal(reset.ambienceLoops, 0)
  assert.equal(reset.activeEffects, 0)
  await page.getByRole('button', { name: 'Start sound', exact: true }).click()
  await page.waitForFunction(() => window.audio.stats().loaded.length === 4)
  assert.equal((await stats()).ambienceLoops, 1)
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: true,
    })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await page.waitForFunction(() => window.audio.stats().state === 'suspended')
  assert.equal((await stats()).ambienceLoops, 0)
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: false,
    })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await page.waitForFunction(() => window.audio.stats().state === 'running')
  assert.equal((await stats()).ambienceLoops, 1)
  await page.getByRole('button', { name: 'Reset', exact: true }).click()
  await page.route('**/audio/city.mp3', (route) =>
    route.fulfill({ status: 404, body: '' })
  )
  await page.getByRole('button', { name: 'Start sound', exact: true }).click()
  await page.waitForFunction(
    () =>
      window.audio.stats().errors.length === 1 &&
      window.audio.stats().loaded.length === 3
  )
  const failed = await stats()
  assert.equal(failed.ambienceLoops, 0)
  assert.equal(failed.loaded.length, 3)
  assert.equal(failed.state, 'running')
  assert.deepEqual(errors, [])
  const result = {
    result: 'PASS',
    initial,
    played,
    paused,
    reset,
    failed,
    pageErrors: errors,
    notes: [
      'Real button clicks cover unlock, five events, pause, resume, mute, restart.',
      'Synthetic visibilitychange covers hidden-tab lifecycle.',
      '404 city asset covers graceful missing-audio behavior.',
    ],
  }
  writeFileSync(
    resolve(repository, 'artifacts/audio-check.json'),
    JSON.stringify(result, null, 2)
  )
  console.log(JSON.stringify(result, null, 2))
} finally {
  await browser.close()
  server.close()
}

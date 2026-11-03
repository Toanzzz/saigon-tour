import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import {
  chromium,
  diagnostics,
  executablePath,
  gameUrl,
  meet,
  openGame,
} from './qa-quest-flow.mjs'
import { inspectVoiceUpload, observeMicrophone } from './qa-voice-observer.mjs'

const out = process.env.QA_OUTPUT || 'artifacts/voice'
const mock = process.env.QA_VOICE_MOCK === '1'
const url = new URL(gameUrl)
url.searchParams.set('demo', '1')
url.searchParams.set('debug', '1')
const fixtureText = 'Hello, do you have an errand for me?'
await mkdir(out, { recursive: true })
const wav = process.env.QA_VOICE_WAV || '/tmp/saigon-voice-en.wav'
const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: [
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    `--use-file-for-fake-audio-capture=${wav}`,
  ],
})
const results = []
let currentPage
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({
      locale: 'en-US',
      permissions: ['microphone'],
      viewport: { width, height: width === 390 ? 844 : 900 },
      isMobile: width === 390,
      hasTouch: width === 390,
    })
    const page = await context.newPage()
    currentPage = page
    const errors = []
    const uploads = []
    let mockMode = 'success'
    let finishDelayed
    await observeMicrophone(page)
    if (mock) {
      await page.routeWebSocket('**/*', (socket) => socket.close())
      await page.route(`${url.origin}/api/**`, async (route) => {
        const pathname = new URL(route.request().url()).pathname
        if (pathname.endsWith('/voice/status'))
          return route.fulfill({ json: { available: true } })
        if (!pathname.endsWith('/voice/transcribe')) return route.abort()
        uploads.push(await inspectVoiceUpload(route.request()))
        if (mockMode === 'delayed')
          await new Promise((resolve) => {
            finishDelayed = resolve
          })
        return route
          .fulfill({
            status: mockMode === 'failure' ? 503 : 200,
            json:
              mockMode === 'failure'
                ? { error: 'voice_unavailable' }
                : { text: fixtureText },
          })
          .catch(() => {})
      })
    }
    page.on('pageerror', (error) => errors.push(error.message))
    if (mock) {
      await page.goto(url.toString())
      await page.locator('#player-name').fill('Voice QA Guest')
      await page
        .getByRole('button', { name: 'Start demo', exact: true })
        .click({
          timeout: 60000,
        })
      try {
        await page.waitForFunction(
          () => window.__THREE_GAME_DIAGNOSTICS__?.state.screen === 'playing',
          null,
          { timeout: 8000 }
        )
      } catch {
        await page.locator('#player-name').fill('Voice QA Guest')
        await page
          .getByRole('button', { name: 'Start demo', exact: true })
          .click()
        await page.waitForFunction(
          () => window.__THREE_GAME_DIAGNOSTICS__?.state.screen === 'playing'
        )
      }
    } else await openGame(page)
    await meet(page, 'hoa')
    const mic = page.getByRole('button', {
      name: 'Record a voice message',
      exact: true,
    })
    await mic.waitFor({ timeout: 15000 })
    const cancel = page.getByRole('button', {
      name: 'Cancel recording',
      exact: true,
    })
    await page.locator('#npc-message').fill('Keep this draft')
    await mic.click()
    await cancel.waitFor()
    await page.waitForFunction(() =>
      [...document.querySelectorAll('.voice-wave-bars span')].some(
        (bar) => bar.getBoundingClientRect().height > 5
      )
    )
    const waves = await page.locator('.voice-wave-bars').innerHTML()
    await page.waitForFunction(
      (before) =>
        document.querySelector('.voice-wave-bars')?.innerHTML !== before,
      waves
    )
    assert.equal(await page.locator('#npc-message').count(), 0)
    await page.screenshot({ path: `${out}/listening-${width}.png` })
    await cancel.click()
    assert.equal(
      await page.locator('#npc-message').inputValue(),
      'Keep this draft'
    )
    assert.equal(uploads.length, 0, 'cancel does not upload')
    await page.locator('#npc-message').fill('')
    const before = await page.locator('.speech.user').count()
    const replyBefore = await page.locator('.speech.assistant').count()
    await mic.click()
    await page.waitForTimeout(500)
    const stop = page.getByRole('button', {
      name: 'Send voice message',
      exact: true,
    })
    await stop.waitFor()
    await page.waitForTimeout(4000)
    const posted = page.waitForResponse(
      (response) =>
        response.url().includes('/voice/transcribe') &&
        response.request().method() === 'POST'
    )
    await stop.click()
    await page.locator('#npc-message').waitFor()
    assert.equal(await page.locator('.voice-waveform').count(), 0)
    const response = await posted
    assert.equal(response.status(), 200)
    const { text } = await response.json()
    assert(text.trim(), 'transcription returns a nonempty transcript')
    await page.waitForFunction(
      ({ before, replyBefore }) =>
        document.querySelectorAll('.speech.user').length > before &&
        document.querySelectorAll('.speech.assistant').length > replyBefore &&
        !document.querySelector('.thinking'),
      { before, replyBefore },
      { timeout: 60000 }
    )
    assert(
      (await page.locator('.speech.user').last().innerText()).includes(text),
      'transcript appears as a user chat turn'
    )
    assert.equal(
      await page.evaluate(() => document.body.scrollWidth > innerWidth),
      false
    )
    await page.screenshot({ path: `${out}/success-${width}.png` })
    const playback = page
      .getByLabel('Play your voice message', { exact: true })
      .last()
    await playback.waitFor()
    await playback.evaluate((audio) => audio.play())
    await page.waitForFunction(() =>
      [...document.querySelectorAll('.voice-playback')].some(
        (audio) => audio.currentTime > 0
      )
    )
    await playback.evaluate((audio) => audio.pause())
    // A provider failure leaves typed composition and its draft usable.
    if (mock) mockMode = 'failure'
    else
      await page.route('**/voice/transcribe', (route) =>
        route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: '{"error":"voice_unavailable"}',
        })
      )
    await mic.click()
    await stop.waitFor()
    await page.waitForTimeout(700)
    await stop.click()
    await page
      .getByRole('status')
      .filter({ hasText: 'Voice is unavailable' })
      .waitFor()
    await page
      .getByLabel('Your message', { exact: true })
      .fill('Text still works')
    assert.equal(
      await page.locator('#npc-message').inputValue(),
      'Text still works'
    )
    assert.equal(await page.locator('#npc-message').isEnabled(), true)
    await page.screenshot({ path: `${out}/fallback-${width}.png` })
    if (mock) {
      mockMode = 'success'
      const count = uploads.length
      await mic.click()
      await cancel.waitFor()
      await page
        .getByRole('status', { name: 'Recording ready to send', exact: true })
        .waitFor({ timeout: 20000 })
      assert.equal(uploads.length, count, 'time limit does not upload')
      assert.equal(await stop.isEnabled(), true)
      await cancel.click()
    }
    if (mock) {
      // A late transcript must not send into the next NPC encounter.
      mockMode = 'delayed'
      const sentBefore = uploads.length
      await mic.click()
      await stop.waitFor()
      await page.waitForTimeout(700)
      await stop.click()
      while (uploads.length === sentBefore) await page.waitForTimeout(50)
      await page
        .getByRole('button', { name: 'Close panel', exact: true })
        .click()
      await meet(page, 'linh')
      finishDelayed()
      await page.waitForTimeout(300)
      assert.equal(await page.locator('.speech.user').count(), 0)
      assert.equal(
        await page.evaluate(() =>
          window.__VOICE_QA_STREAMS__.every((stream) =>
            stream.getTracks().every((track) => track.readyState === 'ended')
          )
        ),
        true,
        'all microphone tracks are stopped'
      )
      await page.screenshot({ path: `${out}/cancelled-${width}.png` })
    }
    results.push({
      width,
      mode: mock ? 'synthetic-browser-contract' : 'actual-route',
      text,
      uploads,
      errors,
      state: (await diagnostics(page)).state,
    })
    assert.deepEqual(errors, [])
    await context.close()
  }
  await writeFile(
    `${out}/results.json`,
    `${JSON.stringify(results, null, 2)}\n`
  )
} catch (error) {
  if (currentPage) {
    await currentPage.screenshot({ path: `${out}/failure.png` })
    console.error(
      JSON.stringify({
        body: await currentPage.locator('body').innerText(),
        diagnostics: await diagnostics(currentPage),
        captureErrors: await currentPage.evaluate(
          () => window.__VOICE_QA_CAPTURE_ERRORS__
        ),
        capturedStreams: await currentPage.evaluate(() =>
          window.__VOICE_QA_STREAMS__.map((stream) =>
            stream.getTracks().map((track) => ({
              state: track.readyState,
              settings: track.getSettings(),
            }))
          )
        ),
      })
    )
  }
  throw error
} finally {
  await browser.close()
}

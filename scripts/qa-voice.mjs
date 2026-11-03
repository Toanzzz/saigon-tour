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
    await page.addInitScript(() => {
      const original = navigator.mediaDevices.getUserMedia.bind(
        navigator.mediaDevices
      )
      window.__VOICE_QA_STREAMS__ = []
      window.__VOICE_QA_CAPTURE_ERRORS__ = []
      navigator.mediaDevices.getUserMedia = async (...args) => {
        try {
          const stream = await original(...args)
          window.__VOICE_QA_STREAMS__.push(stream)
          return stream
        } catch (error) {
          window.__VOICE_QA_CAPTURE_ERRORS__.push(
            `${error.name}: ${error.message}`
          )
          throw error
        }
      }
    })
    if (mock) {
      await page.routeWebSocket('**/*', (socket) => socket.close())
      await page.route(`${url.origin}/api/**`, async (route) => {
        const pathname = new URL(route.request().url()).pathname
        if (pathname.endsWith('/voice/status'))
          return route.fulfill({ json: { available: true } })
        if (!pathname.endsWith('/voice/transcribe')) return route.abort()
        const request = route.request()
        const multipart = await new Request('http://voice-qa.test', {
          method: 'POST',
          headers: request.headers(),
          body: request.postDataBuffer(),
        }).formData()
        const audio = multipart.get('audio')
        assert(audio instanceof File)
        const bytes = await audio.arrayBuffer()
        const view = new DataView(bytes)
        assert.equal(new TextDecoder().decode(bytes.slice(0, 4)), 'RIFF')
        assert.equal(new TextDecoder().decode(bytes.slice(8, 12)), 'WAVE')
        assert.equal(view.getUint16(20, true), 1)
        assert.equal(view.getUint16(22, true), 1)
        assert.equal(view.getUint32(24, true), 24000)
        assert.equal(view.getUint16(34, true), 16)
        assert(bytes.byteLength > 44 && bytes.byteLength <= 44 + 15 * 48000)
        uploads.push({
          bytes: bytes.byteLength,
          locale: multipart.get('locale'),
        })
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
    const before = await page.locator('.speech.user').count()
    const replyBefore = await page.locator('.speech.assistant').count()
    await mic.click()
    await page.waitForTimeout(500)
    const stop = page.getByRole('button', {
      name: 'Stop recording and send',
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

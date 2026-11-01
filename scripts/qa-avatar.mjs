import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import {
  activate,
  chromium,
  diagnostics,
  executablePath,
  gameUrl,
  openGame,
} from './qa-quest-flow.mjs'

const browser = await chromium.launch({ headless: true, executablePath })
const out = process.env.QA_OUTPUT || 'artifacts/avatar'
await mkdir(out, { recursive: true })
const results = []

/** Wait for the title screen (guest session loaded, not yet playing). */
async function waitTitle(page) {
  await page.waitForFunction(
    () => window.__THREE_GAME_DIAGNOSTICS__?.state.screen === 'title'
  )
}

try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({
      locale: 'en-US',
      viewport: { width, height: width === 390 ? 844 : 900 },
      isMobile: width === 390,
      hasTouch: width === 390,
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (error) => {
      errors.push(error.message)
      console.log('PAGEERROR', error.message)
    })

    // New journey: pick "Young woman" on the title screen, then start.
    await page.goto(gameUrl)
    await waitTitle(page)
    await page.getByRole('button', { name: 'Young woman' }).click()
    await page.waitForFunction(
      () => window.__THREE_GAME_DIAGNOSTICS__?.state.body === 'woman'
    )
    await page.screenshot({ path: `${out}/title-woman-${width}.png` })
    await page.getByRole('button', { name: /^Start exploring/ }).click()
    await page.waitForFunction(
      () => window.__THREE_GAME_DIAGNOSTICS__?.state.screen === 'playing'
    )
    let state = (await diagnostics(page)).state
    assert.equal(state.body, 'woman', 'chosen body should be woman after start')
    await page.screenshot({ path: `${out}/playing-woman-${width}.png` })

    // Reload: the body persists from the saved profile.
    await page.reload()
    await page.waitForFunction(
      () => window.__THREE_GAME_DIAGNOSTICS__?.state.body === 'woman'
    )
    state = (await diagnostics(page)).state
    assert.equal(state.body, 'woman', 'body should persist across reload')

    results.push({ width, body: state.body, errors })
    assert.equal(errors.length, 0, `no page errors at ${width}px`)
    await context.close()
  }

  // Multiplayer: a woman and a man share the world; each sees the other's body.
  const womanCtx = await browser.newContext({
    locale: 'en-US',
    viewport: { width: 1280, height: 860 },
  })
  const manCtx = await browser.newContext({
    locale: 'en-US',
    viewport: { width: 1280, height: 860 },
  })
  const mpErrors = []
  const woman = await womanCtx.newPage()
  const man = await manCtx.newPage()
  woman.on('pageerror', (e) => mpErrors.push(`woman: ${e.message}`))
  man.on('pageerror', (e) => mpErrors.push(`man: ${e.message}`))

  await woman.goto(gameUrl)
  await waitTitle(woman)
  await woman.getByRole('button', { name: 'Young woman' }).click()
  await woman.waitForFunction(
    () => window.__THREE_GAME_DIAGNOSTICS__?.state.body === 'woman'
  )
  await woman.getByRole('button', { name: /^Start exploring/ }).click()
  await woman.waitForFunction(
    () => window.__THREE_GAME_DIAGNOSTICS__?.state.screen === 'playing'
  )
  // The man keeps the default body.
  await openGame(man)

  for (const page of [woman, man]) {
    await activate(page)
    await page.waitForFunction(
      () => window.__THREE_GAME_DIAGNOSTICS__?.network.playerCount >= 2,
      null,
      { timeout: 30000 }
    )
  }
  // The man's client should receive the woman's body through presence.
  await man.waitForFunction(
    () =>
      window.__THREE_GAME_DIAGNOSTICS__?.network.remoteBodies.includes('woman'),
    null,
    { timeout: 30000 }
  )
  const manNet = (await diagnostics(man)).network
  assert(
    manNet.remoteBodies.includes('woman'),
    'remote presence should carry the woman body'
  )
  await man.screenshot({ path: `${out}/multiplayer-man-view.png` })
  assert.equal(mpErrors.length, 0, 'no multiplayer page errors')
  results.push({ multiplayer: manNet.remoteBodies, errors: mpErrors })

  await womanCtx.close()
  await manCtx.close()
  await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2))
  console.log('AVATAR_QA_OK', JSON.stringify(results))
} finally {
  await browser.close()
}

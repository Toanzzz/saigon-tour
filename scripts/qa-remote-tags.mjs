import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium, executablePath, gameUrl } from './qa-quest-flow.mjs'
import { bind, enterLivePlay } from './qa-shops-live-helpers.mjs'

const out = process.env.QA_OUTPUT || 'artifacts/remote-tags'
await mkdir(out, { recursive: true })
const browsers = await Promise.all([
  chromium.launch({ headless: true, executablePath }),
  chromium.launch({ headless: true, executablePath }),
])
const results = []
const errors = []
let currentPage

async function attachProbe(page) {
  await page.evaluate(async () => {
    const load = (path) =>
      import(
        performance
          .getEntriesByType('resource')
          .map((entry) => entry.name)
          .filter((url) => new URL(url).pathname === path)
          .at(-1) || path
      )
    const [{ _roots }, { Vector3 }, presence] = await Promise.all([
      import('/node_modules/.vite/deps/@react-three_fiber.js'),
      import('/node_modules/.vite/deps/three.js'),
      load('/src/shared/api/presence.ts'),
    ])
    window.tagProbe = { roots: _roots, Vector3, presence }
  })
}

async function measure(page, name) {
  return page.evaluate((name) => {
    const { roots, Vector3, presence } = window.tagProbe
    const state = [...roots.values()][0].store.getState()
    const targetEntry = [...presence.presence.values()].find(
      (entry) => entry.samples.at(-1)?.player.name === name
    )
    const target =
      targetEntry &&
      presence.interpolate(targetEntry.samples, performance.now())
    const tag = [...document.querySelectorAll('.remote-tag')].find(
      (element) => element.textContent === name
    )
    if (!target || !tag) return null
    const groups = []
    state.scene.traverse((object) => {
      if (
        object.type !== 'Group' ||
        object.position.y !== 3 ||
        !object.parent?.parent
      )
        return
      const root = object.parent.parent
      const distance = Math.hypot(
        root.position.x - target.position[0],
        root.position.z - target.position[2]
      )
      groups.push({ object, root, distance })
    })
    groups.sort((a, b) => a.distance - b.distance)
    const group = groups[0]
    if (!group) return null
    const world = group.object.getWorldPosition(new Vector3())
    const point = world.clone().project(state.camera)
    const projected = [
      ((point.x + 1) * state.size.width) / 2,
      ((1 - point.y) * state.size.height) / 2,
    ]
    const rect = tag.getBoundingClientRect()
    const actual = [rect.x + rect.width / 2, rect.y + rect.height / 2]
    return {
      projected,
      actual,
      world: world.toArray(),
      errorPx: Math.hypot(actual[0] - projected[0], actual[1] - projected[1]),
      visible:
        rect.right > 0 &&
        rect.left < innerWidth &&
        rect.bottom > 0 &&
        rect.top < innerHeight,
    }
  }, name)
}

try {
  for (const width of process.env.QA_WIDTH
    ? [Number(process.env.QA_WIDTH)]
    : [1440, 390]) {
    const contexts = await Promise.all(
      browsers.map((browser, i) =>
        browser.newContext({
          viewport: {
            width: i ? 1000 : width,
            height: width === 390 ? 844 : 900,
          },
          locale: 'en-US',
          isMobile: !i && width === 390,
          hasTouch: !i && width === 390,
        })
      )
    )
    const pages = await Promise.all(
      contexts.map((context) => context.newPage())
    )
    const name = `Tag sender ${width}`
    for (const [index, page] of pages.entries()) {
      currentPage = page
      page.on('pageerror', (error) => errors.push(error.message))
      await page.goto(gameUrl)
      await bind(page)
      await page
        .locator('#player-name')
        .fill(index ? name : `Tag observer ${width}`)
      await enterLivePlay(page)
    }
    const [observer, sender] = pages
    currentPage = observer
    await attachProbe(observer)
    await observer.evaluate(() =>
      window.__THREE_GAME_TEST_HOOKS__.teleport(4, 12)
    )
    await sender.evaluate(() =>
      window.__THREE_GAME_TEST_HOOKS__.teleport(2, 12)
    )
    await observer.waitForFunction(
      (name) =>
        [...document.querySelectorAll('.remote-tag')].some(
          (element) => element.textContent === name
        ),
      name
    )
    await observer.waitForTimeout(2500)
    const samples = []
    for (const key of ['KeyD', 'KeyW', 'KeyA', 'KeyS']) {
      await sender.keyboard.down(key)
      for (let i = 0; i < 8; i++) {
        await observer.waitForTimeout(80)
        const sample = await measure(observer, name)
        if (sample) samples.push(sample)
      }
      await sender.keyboard.up(key)
    }
    await sender.evaluate(() =>
      window.__THREE_GAME_TEST_HOOKS__.teleport(8, 12)
    )
    for (let i = 0; i < 20; i++) {
      await observer.waitForTimeout(20)
      const sample = await measure(observer, name)
      if (sample) samples.push(sample)
    }
    assert(
      samples.length >= 40,
      'the live remote tag is sampled throughout movement'
    )
    const maximumError = Math.max(...samples.map((sample) => sample.errorPx))
    const displacement =
      Math.max(...samples.map((sample) => sample.world[0])) -
      Math.min(...samples.map((sample) => sample.world[0]))
    assert(displacement > 3, 'the remote avatar actually moves')
    assert(
      maximumError < 1.5,
      `tag stays on the rendered avatar: ${maximumError}px`
    )
    assert(
      samples.every((sample) => sample.visible),
      'remote tag stays in the visible play area'
    )
    await observer.screenshot({ path: `${out}/following-${width}.png` })
    assert.equal(
      await observer.evaluate(
        () => document.documentElement.scrollWidth > innerWidth
      ),
      false
    )
    results.push({
      width,
      realClients: 2,
      movement: 'keyboard + teleport stress fixture',
      maximumError,
      displacement,
      samples,
    })
    await Promise.all(contexts.map((context) => context.close()))
  }
  assert.deepEqual(errors, [])
  await writeFile(
    `${out}/results.json`,
    JSON.stringify({ results, errors }, null, 2)
  )
  console.log(
    'REMOTE_TAG_QA_OK',
    JSON.stringify(results.map(({ samples, ...result }) => result))
  )
} catch (error) {
  await currentPage?.screenshot({ path: `${out}/failure.png` }).catch(() => {})
  await writeFile(
    `${out}/failure.json`,
    JSON.stringify({ error: String(error), errors, results }, null, 2)
  )
  throw error
} finally {
  await Promise.all(browsers.map((browser) => browser.close()))
}

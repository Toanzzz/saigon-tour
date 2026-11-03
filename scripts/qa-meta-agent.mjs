import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import {
  chromium,
  executablePath,
  gameUrl,
  offerQuest,
  openGame,
} from './qa-quest-flow.mjs'

const out = process.env.QA_OUTPUT || 'artifacts/demo-meta'
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ headless: true, executablePath })
const turns = []
const observations = []
let activePage
const width = Number(process.env.QA_WIDTH || 1440)
try {
  const page = await browser.newPage({
    locale: 'en-US',
    viewport: { width, height: width === 390 ? 844 : 900 },
    isMobile: width === 390,
    hasTouch: width === 390,
  })
  activePage = page
  page.on('response', (response) => {
    if (!response.url().includes('/interact')) return
    observations.push(
      (async () => {
        const body = await response.text()
        const result = response.headers()['content-type']?.includes('ndjson')
          ? body
              .trim()
              .split('\n')
              .map((line) => JSON.parse(line))
              .find((event) => event.type === 'result')?.response
          : JSON.parse(body)
        turns.push({
          width,
          source: result?.source,
          degraded: result?.degraded,
          toolCalls: result?.toolCalls,
          reply: result?.reply,
          quests: result?.quests,
          demo: response.request().postDataJSON()?.demo ?? false,
        })
      })()
    )
  })
  // openGame reads GAME_URL, which must be a normal non-demo URL.
  assert(!new URL(gameUrl).searchParams.has('demo'))
  await openGame(page)
  await offerQuest(page)
  await Promise.all(observations)
  await page.screenshot({ path: `${out}/live-tool.png` })
  await writeFile(`${out}/results.json`, JSON.stringify(turns, null, 2))
  assert(
    turns.some(
      (turn) => turn.source === 'live' && !turn.demo && turn.toolCalls?.length
    ),
    'A non-demo live model turn must execute a tool'
  )
  console.log('META_AGENT_QA_OK', JSON.stringify(turns))
} catch (error) {
  await Promise.allSettled(observations)
  await writeFile(`${out}/results.json`, JSON.stringify(turns, null, 2))
  await activePage?.screenshot({ path: `${out}/failure.png` })
  throw error
} finally {
  await browser.close()
}

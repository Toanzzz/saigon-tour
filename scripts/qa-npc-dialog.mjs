import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import {
  chromium,
  diagnostics,
  executablePath,
  openGame,
} from './qa-quest-flow.mjs'

const out = process.env.QA_OUTPUT || 'artifacts/npc-dialog-clarity'
await mkdir(out, { recursive: true })

// Drive the game store directly from the dev server for exact dialog states.
async function apply(page, kind) {
  await page.evaluate(async (kind) => {
    const { update } = await import('/src/shared/state/game.ts')
    const dialogue = {
      npc: 'hoa',
      requestId: `qa-${kind}`,
      history: [
        {
          role: 'assistant',
          content: 'Chào bạn! The market is busy and bright today.',
        },
      ],
      thinking: false,
      source: 'live',
    }
    const quest = (over) => ({
      id: 'q_hoa_1',
      giverNpcId: 'hoa',
      title: 'Fresh herbs for a neighbor',
      description: 'Bring these fresh herbs to Chị Linh in the park.',
      steps: [{ type: 'DELIVER', itemId: 'herbs', npcId: 'linh' }],
      scope: 'solo',
      reward: { currency: 25, itemId: null, reputation: 1 },
      progress: [false],
      status: 'active',
      createdAt: Date.now(),
      ...over,
    })
    if (kind === 'available') {
      update({ quests: [], dialogue })
    } else if (kind === 'active') {
      update({ quests: [quest()], trackedQuestId: null, dialogue })
    } else if (kind === 'ready') {
      update({
        quests: [quest({ progress: [true], status: 'ready' })],
        dialogue,
      })
    } else if (kind === 'full') {
      const quests = ['q_a', 'q_b', 'q_c'].map((id) =>
        quest({
          id,
          giverNpcId: 'tam',
          title: 'A riverside hello',
          steps: [{ type: 'TALK_TO', npcId: 'ba' }],
        })
      )
      update({ quests, dialogue })
    }
  }, kind)
  await page.locator('dialog.conversation').waitFor()
  await page.locator('.errands').waitFor()
}

const browser = await chromium.launch({ headless: true, executablePath })
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: width === 390 ? 844 : 900 },
      isMobile: width === 390,
      hasTouch: width === 390,
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await openGame(page)

    await apply(page, 'available')
    assert.match(
      await page.locator('.errands').innerText(),
      /Ask for an errand/
    )
    await page.screenshot({ path: `${out}/available-${width}.png` })

    await apply(page, 'active')
    const activeText = await page.locator('.errands').innerText()
    assert.match(activeText, /In progress/)
    assert.match(activeText, /Track/)
    await page.screenshot({ path: `${out}/active-${width}.png` })

    await apply(page, 'ready')
    const readyText = await page.locator('.errands').innerText()
    assert.match(readyText, /Ready/)
    assert.match(readyText, /Turn in/)
    await page.screenshot({ path: `${out}/ready-${width}.png` })

    await apply(page, 'full')
    const fullText = await page.locator('.errands').innerText()
    assert.match(fullText, /Journal full \(3\/3\)/)
    await page.screenshot({ path: `${out}/full-${width}.png` })

    assert.equal(
      await page.evaluate(() => document.body.scrollWidth > innerWidth),
      false,
      `horizontal overflow at ${width}`
    )
    assert.deepEqual(errors, [], `page errors at ${width}`)
    console.log(`ok ${width}`, (await diagnostics(page)).state.screen)
    await context.close()
  }
  console.log('npc-dialog verification passed')
} finally {
  await browser.close()
}

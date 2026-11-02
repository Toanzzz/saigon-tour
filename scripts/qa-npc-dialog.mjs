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
    // After HMR, Vite serves the app's copy as game.ts?t=…; import that instance.
    const loaded = performance
      .getEntriesByType('resource')
      .map((entry) => entry.name)
      .filter((name) => name.includes('/src/shared/state/game.ts'))
      .at(-1)
    const { update } = await import(loaded ?? '/src/shared/state/game.ts')
    const dialogue = {
      npc: 'hoa',
      requestId: `qa-${kind}`,
      history: [
        {
          role: 'assistant',
          content: 'Chào bạn! The market is busy and bright today.',
        },
      ],
      openedAt: new Date().toISOString(),
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
    } else if (kind === 'collapse') {
      update({
        quests: [quest()],
        trackedQuestId: null,
        dialogue: {
          npc: 'hoa',
          requestId: 'qa-collapse',
          earlierCount: 3,
          history: [
            { role: 'assistant', content: 'Chào bạn! Welcome back.' },
            { role: 'user', content: 'let me help' },
            {
              role: 'assistant',
              content: 'Thank you! Your errand is in the journal.',
            },
            {
              role: 'assistant',
              content: 'Here again — come back when it is done.',
              greeting: true,
            },
          ],
          thinking: false,
          source: 'fallback',
        },
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
      locale: 'en-US',
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
      /if they need a hand|ask if they need a hand/i
    )
    await page.screenshot({ path: `${out}/available-${width}.png` })

    // The header portrait is enlarged (~1.5-2x the old 52/46px).
    const portrait = page.locator('.affinity-portrait')
    const portraitWidth = await portrait.evaluate(
      (el) => el.getBoundingClientRect().width
    )
    assert.ok(
      portraitWidth >= 70,
      `portrait too small at ${width}: ${portraitWidth}px`
    )

    // Quest accept/finish fires a celebration burst with the jingle.
    for (const kind of ['accepted', 'completed']) {
      await page.evaluate(async (kind) => {
        const loaded = performance
          .getEntriesByType('resource')
          .map((entry) => entry.name)
          .filter((name) => name.includes('/src/shared/state/game.ts'))
          .at(-1)
        const { celebrate } = await import(
          loaded ?? '/src/shared/state/game.ts'
        )
        celebrate(kind)
      }, kind)
      await page.locator(`.celebration-${kind}`).waitFor({ state: 'visible' })
      await page.screenshot({ path: `${out}/celebrate-${kind}-${width}.png` })
    }

    await apply(page, 'active')
    const activeText = await page.locator('.errands').innerText()
    assert.match(activeText, /In progress/)
    assert.match(activeText, /Track on map|Tracking on map/)
    await page.screenshot({ path: `${out}/active-${width}.png` })

    // The track button is a real toggle: clicking flips tracked state.
    const trackBtn = page.locator('.errands .track-button')
    assert.equal(await trackBtn.getAttribute('aria-pressed'), 'false')
    await trackBtn.click()
    await page.locator('.errands .track-button[aria-pressed="true"]').waitFor()
    await page.screenshot({ path: `${out}/tracking-${width}.png` })
    await trackBtn.click()
    await page.locator('.errands .track-button[aria-pressed="false"]').waitFor()

    await apply(page, 'ready')
    const readyText = await page.locator('.errands').innerText()
    assert.match(readyText, /Ready/)
    assert.match(readyText, /good news|thank|tell/i)
    await page.screenshot({ path: `${out}/ready-${width}.png` })

    await apply(page, 'full')
    const fullText = await page.locator('.errands').innerText()
    assert.match(fullText, /Journal full \(3\/3\)/)
    await page.screenshot({ path: `${out}/full-${width}.png` })

    await apply(page, 'collapse')
    const log = page.locator('.conversation-history')
    assert.equal(await page.locator('.history-toggle').count(), 0)
    assert.match(await log.innerText(), /let me help/)
    assert.match(await log.innerText(), /errand is in the journal/i)
    assert.match(await log.innerText(), /come back when it is done/i)
    assert.match(await log.innerText(), /New encounter/)
    await page.screenshot({ path: `${out}/history-visible-${width}.png` })

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

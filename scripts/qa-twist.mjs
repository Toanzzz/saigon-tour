import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import {
  chromium,
  diagnostics,
  dismiss,
  executablePath,
  meet,
  offerQuest,
  openGame,
  teleport,
} from './qa-quest-flow.mjs'

// Local location centres (qa-quest-flow keeps these private); only the ones
// Linh's arc visits are needed here.
const locations = {
  market: [-23, 7],
  park: [24, -2],
  cathedral: [88, -65],
}
const itemLabels = { postcard: 'postcard' }

/** Deliver the item named in a DELIVER step to its live target NPC. */
async function deliver(page, step) {
  await meet(page, step.npcId)
  await page
    .getByRole('button', {
      name: `Give ${itemLabels[step.itemId] ?? step.itemId}`,
      exact: true,
    })
    .click()
}

/** Complete one step, reading the LIVE quest so a twist redirects the final leg. */
async function doStep(page, id, index) {
  const live = (await diagnostics(page)).state.quests.find((q) => q.id === id)
  const step = live.steps[index]
  if (step.type === 'GO_TO') await teleport(page, ...locations[step.locationId])
  else if (step.type === 'TALK_TO') await meet(page, step.npcId)
  else if (step.type === 'DELIVER') await deliver(page, step)
  await page.waitForFunction(
    ([id, index]) =>
      window.__THREE_GAME_DIAGNOSTICS__?.state.quests?.find((q) => q.id === id)
        ?.progress[index],
    [id, index],
    { timeout: 30000 }
  )
}

const browser = await chromium.launch({ headless: true, executablePath })
const out = process.env.QA_OUTPUT || 'artifacts/quest-twist'
const results = []
await mkdir(out, { recursive: true })
try {
  for (const [locale, width] of [
    ['en-US', 1440],
    ['vi-VN', 1440],
    ['en-US', 390],
    ['vi-VN', 390],
  ]) {
    const context = await browser.newContext({
      locale,
      viewport: { width, height: width === 390 ? 844 : 900 },
      isMobile: width === 390,
      hasTouch: width === 390,
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (error) => errors.push(error.stack ?? error.message))
    await openGame(page)

    // Linh's arc: GO_TO market, TALK_TO hoa, DELIVER postcard -> mai (twist -> thao).
    const offered = await offerQuest(page, 'linh')
    assert.equal(offered.steps.length, 3, 'Linh arc has three steps')
    const finalTarget = offered.steps[2]
    assert.equal(finalTarget.type, 'DELIVER')
    assert.equal(finalTarget.npcId, 'mai', 'arc starts aimed at Mai')
    assert(offered.twist, 'arc carries a twist')
    assert.equal(offered.twist.step.npcId, 'thao', 'twist redirects to Thao')
    await dismiss(page)

    // Steps 1-2: visit the market, then greet Hoa (the Shō target). Greeting Hoa
    // completes TALK_TO and applies the twist, which rewrites the final step.
    await doStep(page, offered.id, 0)
    await doStep(page, offered.id, 1)

    // The twist applied: the toast fired and the quest now points to Thao.
    const twisted = (await diagnostics(page)).state.quests.find(
      (q) => q.id === offered.id
    )
    assert(twisted.twist?.replaced, 'twist marked the quest as replaced')
    assert.equal(twisted.steps[2].npcId, 'thao', 'final step now targets Thao')
    await page.screenshot({ path: `${out}/twist-toast-${locale}-${width}.png` })

    // The journal shows the replaced step struck through, with the twist line.
    if (width === 390) {
      await page
        .getByRole('button', { name: 'Open city hub', exact: true })
        .click()
      await page
        .getByRole('button', { name: 'Open journal', exact: true })
        .click()
    } else
      await page
        .getByRole('button', { name: 'Open journal', exact: true })
        .click()
    const questSection = page.getByRole('region', {
      name: twisted.title,
      exact: true,
    })
    assert(
      (await questSection.locator('s.journal-twist-old').count()) > 0,
      'journal strikes through the replaced step'
    )
    assert(
      (await questSection.locator('.journal-twist-line').count()) > 0,
      'journal shows the twist line'
    )
    await page.screenshot({
      path: `${out}/twist-journal-${locale}-${width}.png`,
    })
    await dismiss(page)

    // The quest pin moved to Thao (nextStep now targets her).
    await page.waitForFunction(
      (title) =>
        [...document.querySelectorAll('svg title')].some((node) =>
          node.textContent?.includes(`Errand target: ${title}`)
        ),
      twisted.title,
      { timeout: 30000 }
    )

    // Ketsu: deliver to Thao, then return to Linh for the payoff.
    await doStep(page, offered.id, 2)
    const before = (await diagnostics(page)).state
    await meet(page, 'linh')
    await page.waitForFunction(
      (completed) =>
        window.__THREE_GAME_DIAGNOSTICS__?.state.completed > completed,
      before.completed,
      { timeout: 30000 }
    )
    const after = await diagnostics(page)
    assert.equal(after.state.completed, before.completed + 1, 'quest completed')
    assert.equal(
      after.state.currency,
      before.currency + offered.reward.currency,
      'payoff reward granted'
    )
    assert.equal(
      await page.evaluate(() => document.body.scrollWidth > innerWidth),
      false,
      'no horizontal overflow'
    )

    results.push({ locale, width, offered, twisted, after, errors })
    await writeFile(`${out}/twist.json`, JSON.stringify(results, null, 2))
    assert.deepEqual(errors, [])
    await context.close()
  }
  await writeFile(`${out}/twist.json`, JSON.stringify(results, null, 2))
} finally {
  await browser.close()
}

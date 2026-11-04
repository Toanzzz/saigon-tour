import assert from 'node:assert/strict'

export async function bind(page) {
  await page.waitForFunction(() => window.__THREE_GAME_TEST_HOOKS__)
  await page.evaluate(async () => {
    const load = (path) =>
      import(
        performance
          .getEntriesByType('resource')
          .map((entry) => entry.name)
          .filter((url) => new URL(url).pathname === path)
          .at(-1) || path
      )
    const [state, transport, status, city] = await Promise.all([
      load('/src/shared/state/game.ts'),
      load('/src/shared/api/transport.ts'),
      load('/src/shared/api/status.ts'),
      load('/src/shared/api/city.ts'),
    ])
    window.liveShopQa = {
      ...state,
      ...transport,
      net: status.net,
      city: city.city,
    }
  })
  await page.waitForFunction(
    () => window.liveShopQa.game.state.guestStatus === 'online',
    null,
    { timeout: 30000 }
  )
  await page.waitForFunction(
    () => window.liveShopQa.net.state.connection === 'connected',
    null,
    { timeout: 30000 }
  )
}

export async function saved(page) {
  return page.evaluate(async () => {
    const { apiUrl, authorizationHeaders } = window.liveShopQa
    const response = await fetch(apiUrl('/me'), {
      credentials: 'include',
      headers: authorizationHeaders(),
    })
    if (!response.ok) throw new Error(`me_${response.status}`)
    return (await response.json()).player
  })
}

export async function enterLivePlay(page) {
  await page.waitForTimeout(1000)
  await page.locator('.title-start').click()
  try {
    await page.waitForFunction(
      () => window.liveShopQa.game.state.screen === 'playing',
      null,
      { timeout: 8000 }
    )
  } catch (error) {
    if (!(await page.locator('.title-start').isVisible())) throw error
    await page.locator('.title-start').click()
    await page.waitForFunction(
      () => window.liveShopQa.game.state.screen === 'playing'
    )
  }
}

export async function meetLive(page, good, vi) {
  if (await page.locator('dialog[open]').count())
    await page.keyboard.press('Escape')
  await page.waitForFunction(
    () => !window.__THREE_GAME_DIAGNOSTICS__.network.events.httpBusy
  )
  const at = await page.evaluate(({ npc, at }) => {
    const placed = window.liveShopQa.city.state.npcPlacements[npc]?.position
    const target = placed ? [placed[0], placed[2]] : at
    const approach =
      npc === 'bread-vendor'
        ? [target[0] + 2, target[1]]
        : [target[0], target[1] + 2]
    window.__THREE_GAME_TEST_HOOKS__.teleport(...approach)
    return approach
  }, good)
  await page.waitForFunction(([x, z]) => {
    const at = window.liveShopQa.game.state.position
    return Math.abs(at[0] - x) < 0.6 && Math.abs(at[2] - z) < 0.6
  }, at)
  await page.waitForTimeout(500)
  const interact = page.locator('.touch-interact')
  if (await interact.isVisible()) await interact.click()
  else await page.keyboard.press('e')
  await page.locator('dialog.conversation').waitFor()
  await page.waitForFunction(
    () => !window.liveShopQa.game.state.dialogue?.thinking,
    null,
    { timeout: 30000 }
  )
  assert.equal(
    await page.evaluate(() => window.liveShopQa.game.state.dialogue?.npc),
    good.npc
  )
  await page
    .getByRole('button', { name: vi ? 'Cửa hàng' : 'Shop', exact: true })
    .click()
}

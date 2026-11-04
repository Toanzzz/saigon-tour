import { writeFile } from 'node:fs/promises'

/** Synthetic rare sale responses; live commerce has a separate browser check. */
export async function mockRareCommerce(page, save) {
  await page.route('**/me/shop/buy', async (route) => {
    const request = route.request().postDataJSON()
    save.world.currency -= 800
    save.unlocks.owned.push('lacquer-non-la')
    save.revision++
    await route.fulfill({
      json: {
        player: save,
        receipt: { requestId: request.requestId, restore: 0 },
      },
    })
  })
  await page.route('**/me/equip', async (route) => {
    const request = route.request().postDataJSON()
    save.unlocks.equipped[request.slot] = request.id
    save.revision++
    await route.fulfill({ json: { player: save } })
  })
}

export async function assertExpiredRareOffer(page) {
  await page.evaluate(() =>
    window.shopQa.city.setState((value) => ({
      ...value,
      rareOffer: {
        ...window.shopQa.sale,
        unlockId: 'silk-scarf',
        price: 1100,
        endsAt: Date.now() - 1,
      },
    }))
  )
  await page.waitForFunction(
    () => document.querySelector('.rare-offer .primary-button')?.disabled
  )
}

export async function captureShopFailure(browser, out, error) {
  const page = browser.contexts().at(-1)?.pages().at(-1)
  if (!page) return
  await page.screenshot({ path: `${out}/failure.png` }).catch(() => {})
  const state = await page
    .evaluate(() => ({
      game: window.shopQa?.game.state,
      stamina: window.shopQa?.stamina.state,
      text: document.body.innerText,
    }))
    .catch(() => null)
  await writeFile(
    `${out}/failure.json`,
    JSON.stringify({ error: String(error), state }, null, 2)
  )
}

import assert from 'node:assert/strict'

export async function verifyCityLife({
  page,
  diag,
  teleport,
  capture,
  mobile,
}) {
  const observations = {}
  for (const [name, x, z] of [
    ['market-crowd', -25, 7],
    ['plaza-crowd', 69, 8],
    ['river-crowd', 30, 32],
    ['alley-crowd', -25, 28],
  ]) {
    await teleport(x, z)
    await capture(name)
    const world = (await diag()).world
    assert(world, 'world diagnostics report city life')
    assert.equal(
      world.ambientCount,
      20,
      'twenty ambient residents are authored'
    )
    assert(
      world.activeCrowd > 0 && world.activeCrowd < 20,
      'only nearby ambient residents animate'
    )
    observations[name] = world
  }
  const conversations = []
  for (const [id, name, x, z] of [
    ['mai', 'Mai', -30, 18],
    ['alex', 'Alex', 92, -38],
  ]) {
    await teleport(x, z + 1)
    const wallet = (await diag()).state.currency
    if (mobile) await page.locator('button.touch-interact').click()
    else await page.keyboard.press('e')
    await page.getByRole('heading', { name, exact: true }).waitFor()
    await page.locator('.speech.assistant').first().waitFor({ timeout: 30000 })
    await page
      .getByLabel('Your message')
      .fill('I enjoy coffee and architecture. What should I notice nearby?')
    await page
      .getByRole('button', { name: 'Send message', exact: true })
      .click()
    await page.locator('.speech.assistant').nth(1).waitFor({ timeout: 30000 })
    assert.equal(
      (await diag()).state.currency,
      wallet,
      'conversation keeps the wallet unchanged'
    )
    assert.equal(
      await page.getByRole('button', { name: 'Any errands?' }).count(),
      1,
      'every neighbor offers an errand'
    )
    await capture(`conversation-${id}`)
    conversations.push({
      id,
      lines: await page.locator('.speech.assistant').allTextContents(),
      source: await page.locator('.source-label').innerText(),
    })
    await page
      .getByRole('button', { name: 'Continue exploring', exact: true })
      .click()
  }
  return { observations, conversations }
}

import assert from 'node:assert/strict'

export async function movePlayer(page, context, diag, mobile) {
  const before = await diag()
  if (mobile) {
    const stick = page.getByRole('group', { name: 'Movement joystick' })
    const box = await stick.boundingBox()
    assert(box, 'movement joystick is visible')
    const cdp = await context.newCDPSession(page)
    const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [point],
    })
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ ...point, y: point.y - 34 }],
    })
    await page.waitForTimeout(1000)
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    })
    await cdp.detach()
    await page.waitForTimeout(300)
    assert(
      (await diag()).state.position[2] < before.state.position[2] - 1,
      'touch joystick moves the player'
    )
    await page.waitForFunction(() =>
      document
        .querySelector('.stick-knob')
        ?.getAttribute('style')
        ?.includes('translate(0px, 0px)')
    )
  } else {
    await page.keyboard.down('w')
    await page.waitForTimeout(1000)
    await page.keyboard.up('w')
    await page.waitForTimeout(300)
    assert(
      (await diag()).state.position[2] < before.state.position[2] - 2,
      'W moves the player'
    )
  }
  return before
}

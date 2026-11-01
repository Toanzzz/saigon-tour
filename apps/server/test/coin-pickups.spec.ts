import { COIN_PICKUP_AMOUNT, COIN_PICKUPS } from '@saigon/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '@/app'
import { readConfig } from '@/shared'
import { fixture } from './fixture'

let fx: Awaited<ReturnType<typeof fixture>>
const config = { ...readConfig({}), production: true }
beforeAll(async () => {
  fx = await fixture()
})
afterAll(async () => {
  await fx.close()
})
const headers = (token: string) => ({ Authorization: `Bearer ${token}` })
const coin = COIN_PICKUPS[0].id

describe('world coin pickups', () => {
  it('grants a coin once and ignores repeats', async () => {
    const { token, player } = await fx.guest()
    const app = createApp(config, fetch, fx)

    const first = await app.request(`/me/pickups/${coin}`, {
      method: 'POST',
      headers: headers(token),
    })
    expect(first.status).toBe(200)
    const firstBody = await first.json()
    expect(firstBody.granted).toBe(true)
    expect(firstBody.amount).toBe(COIN_PICKUP_AMOUNT)
    expect(firstBody.player.world.currency).toBe(30 + COIN_PICKUP_AMOUNT)
    expect(firstBody.player.revision).toBeGreaterThan(player.revision)

    const second = await app.request(`/me/pickups/${coin}`, {
      method: 'POST',
      headers: headers(token),
    })
    const secondBody = await second.json()
    expect(secondBody.granted).toBe(false)
    expect(secondBody.amount).toBe(0)
    expect(secondBody.player.world.currency).toBe(30 + COIN_PICKUP_AMOUNT)

    const rows = await fx.sql.query(
      'SELECT coin_id FROM coin_pickups WHERE player_id=$1',
      [firstBody.player.id]
    )
    expect(rows.rows).toHaveLength(1)
  })

  it('rejects invalid and unknown coin ids', async () => {
    const { token } = await fx.guest()
    const app = createApp(config, fetch, fx)
    expect(
      (
        await app.request('/me/pickups/not-a-coin', {
          method: 'POST',
          headers: headers(token),
        })
      ).status
    ).toBe(400)
    expect(
      (
        await app.request('/me/pickups/coin_does_not_exist', {
          method: 'POST',
          headers: headers(token),
        })
      ).status
    ).toBe(404)
  })

  it('requires authentication', async () => {
    const app = createApp(config, fetch, fx)
    expect(
      (await app.request(`/me/pickups/${coin}`, { method: 'POST' })).status
    ).toBe(401)
  })

  it('clears the ledger on reset so coins grant again', async () => {
    const { token } = await fx.guest()
    const app = createApp(config, fetch, fx)
    const granted = await (
      await app.request(`/me/pickups/${coin}`, {
        method: 'POST',
        headers: headers(token),
      })
    ).json()
    await fx.db.reset(granted.player.id)
    const rows = await fx.sql.query(
      'SELECT coin_id FROM coin_pickups WHERE player_id=$1',
      [granted.player.id]
    )
    expect(rows.rows).toHaveLength(0)
    const again = await (
      await app.request(`/me/pickups/${coin}`, {
        method: 'POST',
        headers: headers(token),
      })
    ).json()
    expect(again.granted).toBe(true)
  })
})

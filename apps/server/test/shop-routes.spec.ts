import { randomUUID } from 'node:crypto'
import { NPC_POSITIONS } from '@saigon/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '@/app'
import { readConfig } from '@/shared'
import { fixture } from './fixture'

let fx: Awaited<ReturnType<typeof fixture>>
beforeAll(async () => {
  fx = await fixture()
})
afterAll(async () => {
  await fx.close()
})
const config = {
  ...readConfig({}),
  production: true,
  directorMode: 'off' as const,
}
const headers = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
})

describe('authenticated shop routes', () => {
  it('buys and consumes through the real route contract and handles replay', async () => {
    const app = createApp(config, fetch, fx)
    const { token, player } = await fx.guest()
    const manager = app.realtime.manager
    manager.connect(player, { send() {}, close() {} })
    const presence = manager.getPlayer(player.id)
    if (!presence) throw new Error('missing_presence')
    presence.position = [...NPC_POSITIONS.mai]
    presence.ride = null
    const input = { requestId: randomUUID(), npcId: 'mai', itemId: 'coffee' }
    const request = () =>
      app.request('/me/shop/buy', {
        method: 'POST',
        headers: headers(token),
        body: JSON.stringify(input),
      })
    const first = await request()
    expect(first.status).toBe(200)
    expect((await first.json()).player.world.currency).toBe(27)
    const replay = await request()
    expect((await replay.json()).player.world.inventory.coffee).toBe(1)
    const used = await app.request('/me/items/use', {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({ requestId: randomUUID(), itemId: 'coffee' }),
    })
    expect(used.status).toBe(200)
    const body = await used.json()
    expect(body.player.world.inventory.coffee).toBe(0)
    expect(body.player.world.effects[0].itemId).toBe('coffee')
    expect(body.receipt.restore).toBe(0)
  })

  it('rejects malformed purchase choices, missing auth and forged purchase events', async () => {
    const app = createApp(config, fetch, fx)
    const { token } = await fx.guest()
    const anonymous = await app.request('/me/items/use', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: randomUUID(), itemId: 'banana' }),
    })
    expect(anonymous.status).toBe(401)
    const malformed = await app.request('/me/shop/buy', {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({
        requestId: randomUUID(),
        npcId: 'mai',
        itemId: 'coffee',
        offerId: 'sale_fake',
      }),
    })
    expect(malformed.status).toBe(400)
    const forged = await app.request('/npc/mai/interact', {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({
        intent: 'open',
        events: [{ type: 'purchase', itemId: 'coffee', credit: true }],
        worldContext: {
          playerLocation: 'market',
          nearbyNpcs: [],
          timeOfDay: 'afternoon',
        },
      }),
    })
    expect(forged.status).toBe(400)
    expect(await forged.json()).toEqual({ error: 'purchase_event_forbidden' })
  })
})

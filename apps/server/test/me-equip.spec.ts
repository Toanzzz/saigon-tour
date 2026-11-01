import { GIVER_UNLOCKS } from '@saigon/shared'
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
const headers = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
})

describe('POST /me/equip', () => {
  it('rejects an unowned unlock and equips an owned one', async () => {
    const app = createApp(config, fetch, fx)
    const { token, player } = await fx.guest()
    const unlockId = GIVER_UNLOCKS.hoa[0]
    const body = JSON.stringify({ slot: 'hat', id: unlockId })

    const rejected = await app.request('/me/equip', {
      method: 'POST',
      headers: headers(token),
      body,
    })
    expect(rejected.status).toBe(409)

    await fx.db.mutatePlayer(player.id, (save) => {
      save.unlocks.owned = [unlockId]
    })
    const ok = await app.request('/me/equip', {
      method: 'POST',
      headers: headers(token),
      body,
    })
    expect(ok.status).toBe(200)
    expect((await ok.json()).player.unlocks.equipped).toEqual({ hat: unlockId })
  })

  it('rejects a malformed equip request', async () => {
    const app = createApp(config, fetch, fx)
    const { token } = await fx.guest()
    const bad = await app.request('/me/equip', {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({ slot: 'wings', id: null }),
    })
    expect(bad.status).toBe(400)
  })
})

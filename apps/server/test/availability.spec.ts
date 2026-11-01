import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createApp } from '@/app'
import { readConfig } from '@/shared'
import { fixture } from './fixture'

let fx: Awaited<ReturnType<typeof fixture>>
beforeAll(async () => {
  fx = await fixture()
})
afterAll(() => fx.close())
describe('storage availability', () => {
  it('returns 503 when model budget storage fails while the save remains readable', async () => {
    const identity = await fx.guest()
    const app = createApp(
      { ...readConfig({}), apiKey: 'test-key', production: true },
      async () => Response.json({}),
      fx
    )
    const reserve = vi
      .spyOn(fx.db, 'reserveSpend')
      .mockRejectedValue(new Error('budget_storage_down'))
    try {
      const response = await app.request('/npc/hoa/interact', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${identity.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Hello',
          intent: 'chat',
          worldContext: { playerLocation: 'market', timeOfDay: 'morning' },
        }),
      })
      expect(response.status).toBe(503)
      expect((await fx.db.player(identity.player.id)).world.currency).toBe(30)
    } finally {
      reserve.mockRestore()
      app.realtime.shutdown()
    }
  })
})

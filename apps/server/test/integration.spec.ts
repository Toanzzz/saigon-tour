import { randomUUID } from 'node:crypto'
import { InMemoryStore } from '@mastra/core/storage'
import { afterAll, describe, expect, it } from 'vitest'
import { createApp } from '@/app'
import { createDb, readConfig } from '@/shared'

const enabled = process.env.RUN_POSTGRES_INTEGRATION === '1'
describe.skipIf(!enabled)('Postgres persistence', () => {
  let db: Awaited<ReturnType<typeof createDb>>
  afterAll(async () => {
    await db?.close()
  })
  it('retains guest progress across application instances and grants concurrent reward once', async () => {
    const config = { ...readConfig(), apiKey: undefined }
    db = await createDb(config.databaseUrl)
    const services = {
      db,
      orm: db.orm,
      storage: new InMemoryStore({ id: randomUUID() }),
    }
    const app = createApp(config, fetch, services)
    const guest = await (
      await app.request('/auth/sign-in/anonymous', {
        method: 'POST',
        headers: { Origin: 'http://localhost:58000' },
      })
    ).json()
    const headers = {
      Authorization: `Bearer ${guest.token}`,
      'Content-Type': 'application/json',
    }
    const interact = (intent: string, events: unknown[] = []) =>
      app.request('/npc/hoa/interact', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: intent,
          intent,
          events,
          worldContext: {
            playerLocation: 'market',
            nearbyNpcs: [],
            timeOfDay: 'morning',
          },
        }),
      })
    expect((await interact('help')).status).toBe(200)
    await interact('chat', [
      { type: 'deliver', itemId: 'herbs', npcId: 'linh' },
    ])
    await Promise.all([interact('check'), interact('check')])
    const other = createApp(config, fetch, services)
    const { player } = await (await other.request('/me', { headers })).json()
    expect(player.world.currency).toBe(80)
    expect(player.world.completedQuestIds).toEqual(['hoa-herbs-delivery'])
    const count = await db.sql.query(
      'SELECT count(*)::int AS count FROM quest_completions WHERE player_id=$1',
      [player.id]
    )
    expect(count.rows[0].count).toBe(1)
    await db.sql.query('DELETE FROM players WHERE id=$1', [player.id])
  })
})

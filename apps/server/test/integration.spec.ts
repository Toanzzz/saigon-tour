import { randomUUID } from 'node:crypto'
import { InMemoryStore } from '@mastra/core/storage'
import { rewardFor, seedsFor } from '@saigon/shared'
import { afterAll, describe, expect, it } from 'vitest'
import { createApp } from '@/app'
import { QuestService } from '@/domain/quests'
import { createDb, GameDb, readConfig } from '@/shared'
import { required } from './support/npc'

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
    expect(player.world.currency).toBe(
      30 + rewardFor(required(seedsFor('hoa')[0])).currency
    )
    expect(player.world.completedQuestIds).toHaveLength(1)
    expect(player.world.completedQuestIds[0]).toMatch(/^q_/)
    const count = await db.sql.query(
      'SELECT count(*)::int AS count FROM quest_completions WHERE player_id=$1',
      [player.id]
    )
    expect(count.rows[0].count).toBe(1)
    await db.sql.query('DELETE FROM players WHERE id=$1', [player.id])
  })
  it('locks party participants across independent service instances and grants each reward once', async () => {
    const config = { ...readConfig(), apiKey: undefined }
    db ??= await createDb(config.databaseUrl)
    const services = {
      db,
      orm: db.orm,
      storage: new InMemoryStore({ id: randomUUID() }),
    }
    const app = createApp(config, fetch, services)
    const members = await Promise.all(
      Array.from({ length: 2 }, async () => {
        const response = await app.request('/auth/sign-in/anonymous', {
          method: 'POST',
          headers: { Origin: 'http://localhost:58000' },
        })
        const guest = await response.json()
        const save = await app.request('/me', {
          headers: { Authorization: `Bearer ${guest.token}` },
        })
        return (await save.json()).player
      })
    )
    const speaker = required(members[0])
    const teammate = required(members[1])
    const party = {
      id: randomUUID(),
      members: members.map((member) => ({
        id: member.id,
        name: member.name,
        color: member.color,
      })),
    }
    const first = new QuestService(db)
    const second = new QuestService(new GameDb(db.pool, db.pool))
    first.party = { snapshot: () => party }
    const offer = await first.proposeQuest(speaker.id, 'hoa', {
      ...required(seedsFor('hoa')[0]),
      scope: 'party',
    })
    if (!offer.accepted) throw new Error(offer.reason)
    await Promise.all(
      members.map((member) =>
        first.applyEvents(member.id, [
          { type: 'deliver', itemId: 'herbs', npcId: 'linh' },
        ])
      )
    )
    const checks = await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        (index % 2 ? first : second).checkQuests(
          index % 2 ? speaker.id : teammate.id,
          'hoa'
        )
      )
    )
    expect(
      checks.flat().filter((event) => event.type === 'completed')
    ).toHaveLength(1)
    for (const member of members) {
      const save = await second.get(member.id)
      expect(save.world.currency).toBe(30 + offer.quest.reward.currency)
      expect(save.completed.map((quest) => quest.id)).toEqual([offer.quest.id])
    }
    const count = await db.sql.query(
      'SELECT count(*)::int AS count FROM quest_completions WHERE quest_id=$1',
      [offer.quest.id]
    )
    expect(count.rows[0]?.count).toBe(2)
    await db.sql.query('DELETE FROM players WHERE id=ANY($1::uuid[])', [
      members.map((member) => member.id),
    ])
    app.realtime.manager.shutdown()
  })
})

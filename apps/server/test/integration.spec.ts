import { randomUUID } from 'node:crypto'
import { InMemoryStore } from '@mastra/core/storage'
import {
  bonusCurrency,
  completionBonus,
  type PlayerEvent,
  type QuestSpec,
} from '@saigon/shared'
import { afterAll, describe, expect, it } from 'vitest'
import { createApp } from '@/app'
import { QuestService } from '@/domain/quests'
import { createDb, GameDb, readConfig } from '@/shared'
import { required } from './support/npc'

const enabled = process.env.RUN_POSTGRES_INTEGRATION === '1'
const delivery = (): QuestSpec => ({
  giverNpcId: 'hoa',
  title: 'Fresh herbs for Linh',
  description: 'Bring fresh herbs to Linh in the park, then return.',
  scope: 'solo',
  steps: [{ type: 'DELIVER', itemId: 'herbs', npcId: 'linh' }],
})

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
    let userId: string | undefined
    let other: ReturnType<typeof createApp> | undefined
    try {
      const guestResponse = await app.request('/auth/sign-in/anonymous', {
        method: 'POST',
        headers: { Origin: 'http://localhost:58000' },
      })
      expect(guestResponse.status).toBe(200)
      const guest = await guestResponse.json()
      userId = guest.user.id
      const headers = {
        Authorization: `Bearer ${guest.token}`,
        'Content-Type': 'application/json',
      }
      const { player: start } = await (
        await app.request('/me', { headers })
      ).json()
      const offer = await app.harness.game.proposeQuest(
        start.id,
        'hoa',
        delivery()
      )
      if (!offer.accepted) throw new Error(offer.reason)
      const interact = (
        npc: 'hoa' | 'linh',
        intent: 'chat' | 'check',
        events: PlayerEvent[] = []
      ) =>
        app.request(`/npc/${npc}/interact`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            message: intent === 'check' ? 'The herbs are delivered.' : 'Here!',
            intent,
            events,
            worldContext: {
              playerLocation: npc === 'hoa' ? 'market' : 'park',
              nearbyNpcs: [npc],
              timeOfDay: 'morning',
            },
          }),
        })
      expect(
        (
          await interact('linh', 'chat', [
            { type: 'deliver', itemId: 'herbs', npcId: 'linh' },
          ])
        ).status
      ).toBe(200)
      expect((await app.harness.game.get(start.id)).quests[0]?.status).toBe(
        'ready'
      )
      const checks = await Promise.all([
        interact('hoa', 'check'),
        interact('hoa', 'check'),
      ])
      expect(checks.map((response) => response.status)).toEqual([200, 200])
      const replies = await Promise.all(
        checks.map((response) => response.json())
      )
      expect(
        replies.flatMap((reply) =>
          reply.questEvents.filter(
            (event: { type: string }) => event.type === 'completed'
          )
        )
      ).toHaveLength(1)
      other = createApp(config, fetch, services)
      const { player } = await (await other.request('/me', { headers })).json()
      const finalCurrency = Math.min(
        100,
        offer.quest.reward.currency +
          bonusCurrency(completionBonus(offer.quest))
      )
      expect(player.world.currency).toBe(30 + finalCurrency)
      expect(player.friendship.hoa?.level).toBe(2)
      expect(player.world.completedQuestIds).toEqual([offer.quest.id])
      const count = await db.sql.query(
        'SELECT count(*)::int AS count FROM quest_completions WHERE player_id=$1',
        [player.id]
      )
      expect(count.rows[0].count).toBe(1)
    } finally {
      other?.realtime.manager.shutdown()
      app.realtime.manager.shutdown()
      if (userId) await db.sql.query('DELETE FROM "user" WHERE id=$1', [userId])
    }
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
    const userIds: string[] = []
    try {
      const members = await Promise.all(
        Array.from({ length: 2 }, async () => {
          const response = await app.request('/auth/sign-in/anonymous', {
            method: 'POST',
            headers: { Origin: 'http://localhost:58000' },
          })
          expect(response.status).toBe(200)
          const guest = await response.json()
          userIds.push(guest.user.id)
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
        ...delivery(),
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
        const finalCurrency = Math.min(
          100,
          offer.quest.reward.currency +
            bonusCurrency(completionBonus(offer.quest))
        )
        expect(save.world.currency).toBe(30 + finalCurrency)
        expect(save.completed.map((quest) => quest.id)).toEqual([
          offer.quest.id,
        ])
      }
      const count = await db.sql.query(
        'SELECT count(*)::int AS count FROM quest_completions WHERE quest_id=$1',
        [offer.quest.id]
      )
      expect(count.rows[0]?.count).toBe(2)
    } finally {
      app.realtime.manager.shutdown()
      if (userIds.length)
        await db.sql.query('DELETE FROM "user" WHERE id=ANY($1::text[])', [
          userIds,
        ])
    }
  })
})

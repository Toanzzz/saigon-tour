import { DEMO_QUEST } from '@saigon/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '@/app'
import { GameService } from '@/domain/game'
import { GameDb, readConfig } from '@/shared'
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

describe('durable guest progress', () => {
  it('advances save revisions across events, rewards, and reset', async () => {
    const { player } = await fx.db.createGuest()
    const game = new GameService(fx.db)
    expect(player.revision).toBe(0)
    const moved = await game.applyEvents(player.id, [
      { type: 'visit', locationId: 'park' },
    ])
    expect(moved.revision).toBe(1)
    const reset = await fx.db.reset(player.id)
    expect(reset.revision).toBe(2)
    expect(reset.world.currency).toBe(30)
    expect((await fx.db.player(player.id)).revision).toBe(2)
  })

  it('issues opaque tokens, stores their hash, and authenticates only valid credentials', async () => {
    const app = createApp(config, fetch, fx)
    const response = await app.request('/guest', { method: 'POST' })
    expect(response.status).toBe(201)
    const { token, player } = await response.json()
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(player.name).toMatch(/\d{2}$/)
    const stored = await fx.sql.query<{ token_hash: string }>(
      'SELECT token_hash FROM players WHERE id=$1',
      [player.id]
    )
    expect(stored.rows[0]?.token_hash).toMatch(/^[a-f0-9]{64}$/)
    expect(stored.rows[0]?.token_hash).not.toBe(token)
    expect((await app.request('/me')).status).toBe(401)
    expect(
      (await app.request('/me', { headers: headers('invalid') })).status
    ).toBe(401)
    const me = await app.request('/me', { headers: headers(token) })
    expect(await me.json()).toEqual({ player })
    expect((await app.request('/me/reset', { method: 'POST' })).status).toBe(
      401
    )
    expect(
      (
        await app.request('/npc/hoa/interact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        })
      ).status
    ).toBe(401)
  })

  it('retains saved progress across app instances and resets the same guest', async () => {
    const { player, token } = await fx.db.createGuest()
    const first = createApp(config, fetch, fx)
    await first.harness.game.offerQuest(player.id, 'hoa', DEMO_QUEST.id)
    await first.harness.memory.remember({
      npcId: 'hoa',
      playerId: player.id,
      fact: 'Enjoys market mornings',
      importance: 'high',
    })
    await first.harness.interact(
      'hoa',
      {
        message: 'Hello!',
        intent: 'greet',
        events: [],
        worldContext: {
          playerLocation: 'market',
          nearbyNpcs: [],
          timeOfDay: 'morning',
        },
      },
      player.id
    )
    const second = createApp(config, fetch, fx)
    const response = await second.request('/me', { headers: headers(token) })
    expect(await response.json()).toMatchObject({
      player: {
        id: player.id,
        name: player.name,
        quest: { id: DEMO_QUEST.id },
        world: { inventory: { herbs: 1 } },
      },
    })
    const reset = await second.request('/me/reset', {
      method: 'POST',
      headers: headers(token),
    })
    expect(await reset.json()).toMatchObject({
      player: {
        id: player.id,
        name: player.name,
        quest: null,
        reputation: 0,
        completed: [],
        world: { currency: 30, inventory: {} },
      },
    })
    expect(await second.harness.memory.recall('hoa', player.id)).toEqual([])
    const memory = await fx.storage.getStore('memory')
    expect(
      await memory?.getThreadById({ threadId: `hoa:${player.id}` })
    ).toBeNull()
  })

  it('serializes concurrent reward checks and persists a single completion', async () => {
    const { player } = await fx.db.createGuest()
    const game = new GameService(fx.db)
    await game.offerQuest(player.id, 'hoa', DEMO_QUEST.id)
    await game.applyEvents(player.id, [
      { type: 'deliver', itemId: 'herbs', npcId: 'linh' },
    ])
    const checks = await Promise.all(
      Array.from({ length: 12 }, () =>
        game.checkQuest(player.id, 'hoa', DEMO_QUEST.id)
      )
    )
    expect(checks.filter((result) => result.rewardGranted)).toHaveLength(1)
    expect(await game.get(player.id)).toMatchObject({
      world: { currency: 80, inventory: { postcard: 1 } },
      reputation: 1,
    })
    const completed = await fx.sql.query(
      'SELECT * FROM quest_completions WHERE player_id=$1',
      [player.id]
    )
    expect(completed.rows).toHaveLength(1)
  })

  it('keeps facts scoped, deduplicated, and bounded to twelve', async () => {
    const { player } = await fx.db.createGuest()
    for (let i = 0; i < 15; i++)
      await fx.db.rememberFact({
        npcId: 'hoa',
        playerId: player.id,
        fact: `Market memory ${i}`,
        importance: i === 0 ? 'high' : 'low',
      })
    await fx.db.rememberFact({
      npcId: 'hoa',
      playerId: player.id,
      fact: 'Market memory 0',
      importance: 'high',
    })
    const facts = await fx.db.recallFacts('hoa', player.id)
    expect(facts).toHaveLength(12)
    expect(facts.some((f) => f.fact === 'Market memory 0')).toBe(true)
    expect(await fx.db.recallFacts('linh', player.id)).toEqual([])
  })
})

describe('daily model budget', () => {
  it('reserves atomically, settles once, and rolls over at UTC midnight', async () => {
    let date = new Date('2099-01-01T23:59:59Z')
    const db = new GameDb(fx.sql, undefined, () => date)
    const reservations = await Promise.all(
      Array.from({ length: 5 }, () => db.reserveSpend(0.05))
    )
    const reserved = reservations.filter((r) => r !== null)
    expect(reserved).toHaveLength(1)
    const reservation = reserved[0]
    if (!reservation) throw new Error('missing reservation')
    const usage = { inputTokens: 100, outputTokens: 20, estimatedUsd: 0.001 }
    await db.settleSpend(reservation, usage)
    await db.settleSpend(reservation, usage)
    const ledger = await fx.sql.query<{
      reserved_usd: string
      input_tokens: number
      calls: number
    }>('SELECT * FROM model_spend WHERE day=$1', ['2099-01-01'])
    expect(Number(ledger.rows[0]?.reserved_usd)).toBeCloseTo(0.001)
    expect(ledger.rows[0]?.input_tokens).toBe(100)
    expect(ledger.rows[0]?.calls).toBe(1)
    expect(await db.reserveSpend(0.05)).not.toBeNull()
    expect(await db.reserveSpend(0.05)).toBeNull()
    date = new Date('2099-01-02T00:00:00Z')
    expect(await db.reserveSpend(0.05)).toMatchObject({ day: '2099-01-02' })
  })

  it('limits barks independently of regular conversation calls', async () => {
    const db = new GameDb(
      fx.sql,
      undefined,
      () => new Date('2099-02-01T12:00:00Z'),
      2
    )
    expect(await db.reserveSpend(5, true)).not.toBeNull()
    expect(await db.reserveSpend(5, true)).not.toBeNull()
    expect(await db.reserveSpend(5, true)).toBeNull()
    expect(await db.reserveSpend(5)).not.toBeNull()
  })
})

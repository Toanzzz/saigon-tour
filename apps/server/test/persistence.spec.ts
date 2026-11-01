import {
  bonusCurrency,
  completionBonus,
  createQuest,
  rewardFor,
} from '@saigon/shared'
import { hoaDelivery } from './support/npc'

const seed = hoaDelivery()
const reward = rewardFor(seed)
// Completing this route with no spend earns the thrifty bonus.
const finalReward =
  reward.currency +
  bonusCurrency(
    completionBonus({ ...createQuest(seed, 'q_fixture'), status: 'ready' })
  )

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '@/app'
import { QuestService } from '@/domain/quests'
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
    const { player } = await fx.guest()
    const game = new QuestService(fx.db)
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

  it('signs in anonymously and authenticates only valid sessions', async () => {
    const app = createApp(config, fetch, fx)
    const response = await app.request('/auth/sign-in/anonymous', {
      method: 'POST',
      headers: { Origin: 'http://localhost:58000' },
    })
    expect(response.status).toBe(200)
    const { token, user } = await response.json()
    expect(user.isAnonymous).toBe(true)
    expect(user.name).toMatch(/^\S+ \S+$/)
    expect(response.headers.get('set-auth-token')).toBeTruthy()
    const me = await app.request('/me', { headers: headers(token) })
    const body = await me.json()
    expect(body).toMatchObject({
      account: { anonymous: true },
      player: { name: user.name, world: { currency: 30 } },
    })
    const stored = await fx.sql.query<{ user_id: string }>(
      'SELECT user_id FROM players WHERE id=$1',
      [body.player.id]
    )
    expect(stored.rows[0]?.user_id).toBe(user.id)
    expect((await app.request('/me')).status).toBe(401)
    expect(
      (await app.request('/me', { headers: headers('invalid') })).status
    ).toBe(401)
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

  it('renames the player and rejects unsafe names', async () => {
    const app = createApp(config, fetch, fx)
    const { token, player } = await fx.guest()
    const rename = (name: string) =>
      app.request('/me/profile', {
        method: 'POST',
        headers: { ...headers(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
    const ok = await rename('  Cô   Lan  ')
    expect(ok.status).toBe(200)
    expect((await ok.json()).player).toMatchObject({
      id: player.id,
      name: 'Cô Lan',
    })
    expect((await rename('<b>x</b>')).status).toBe(400)
    expect((await rename('x')).status).toBe(400)
    const me = await (
      await app.request('/me', { headers: headers(token) })
    ).json()
    expect(me.player.name).toBe('Cô Lan')
  })

  it('reports whether Meta login is configured', async () => {
    const off = createApp(config, fetch, fx)
    expect(await (await off.request('/auth/providers')).json()).toEqual({
      meta: false,
    })
    const on = createApp(
      { ...config, meta: { clientId: 'app', clientSecret: 'shh' } },
      fetch,
      fx
    )
    expect(await (await on.request('/auth/providers')).json()).toEqual({
      meta: true,
    })
  })

  it('retains saved progress across app instances and resets the same guest', async () => {
    const { player, token } = await fx.guest()
    const first = createApp(config, fetch, fx)
    const offered = await first.harness.game.proposeQuest(
      player.id,
      'hoa',
      seed
    )
    await first.harness.memory.remember({
      npcId: 'hoa',
      playerId: player.id,
      fact: 'Enjoys market mornings',
      importance: 'high',
    })
    await first.harness.interact(
      'hoa',
      {
        message: '',
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
        quests: [{ id: offered.accepted ? offered.quest.id : '' }],
        world: { inventory: { broth: 1 } },
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
        quests: [],
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
    const { player } = await fx.guest()
    const game = new QuestService(fx.db)
    await game.proposeQuest(player.id, 'hoa', seed)
    await game.applyEvents(player.id, [
      { type: 'deliver', itemId: 'broth', npcId: 'linh' },
    ])
    const checks = await Promise.all(
      Array.from({ length: 12 }, () => game.checkQuests(player.id, 'hoa'))
    )
    expect(
      checks.flat().filter((result) => result.type === 'completed')
    ).toHaveLength(1)
    expect(await game.get(player.id)).toMatchObject({
      world: { currency: 30 + finalReward, inventory: { postcard: 1 } },
      reputation: 1,
    })
    const completed = await fx.sql.query(
      'SELECT * FROM quest_completions WHERE player_id=$1',
      [player.id]
    )
    expect(completed.rows).toHaveLength(1)
  })

  it('keeps facts scoped, deduplicated, and bounded to twelve', async () => {
    const { player } = await fx.guest()
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

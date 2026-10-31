import { NPCS } from '@saigon/shared'
import { describe, expect, it } from 'vitest'
import { createApp } from '@/app'
import { GREETING_BUCKETS, NPC_PERSONAS } from '@/features/npc'
import {
  ask,
  live,
  offline,
  scripted,
  setupNpc,
  worldContext,
} from './support/npc'

const ctx = setupNpc()

describe('Mastra NPC harness greetings', () => {
  it('caches tool-free greetings and includes the opening in the next live turn', async () => {
    const seen: { messages: unknown[]; tools?: unknown[] }[] = []
    const harness = ctx.fx.harness(
      live,
      scripted(
        [
          { text: 'Chào! Welcome to the warm market morning.' },
          { text: 'The market is full of fresh herbs.' },
        ],
        seen
      )
    )
    const first = await harness.interact(
      'hoa',
      ask('Hello, neighbor!', {
        intent: 'greet',
        worldContext: { ...worldContext, timeOfDay: 'morning' },
      }),
      ctx.playerId
    )
    expect(first).toMatchObject({
      source: 'live',
      cached: false,
      party: null,
      toolCalls: [],
    })
    expect(seen).toHaveLength(1)
    expect(seen[0]?.tools ?? []).toEqual([])
    const other = (await ctx.fx.db.createGuest()).player.id
    const cached = await harness.interact(
      'hoa',
      ask('Hello again!', {
        intent: 'greet',
        worldContext: { ...worldContext, timeOfDay: 'morning' },
      }),
      other
    )
    expect(cached.cached).toBe(true)
    expect(cached.reply).toBe(first.reply)
    expect(seen).toHaveLength(1)
    await harness.interact('hoa', ask('Tell me about breakfast'), ctx.playerId)
    const messages = JSON.stringify(seen.at(-1)?.messages)
    expect(messages).toContain('Hello, neighbor!')
    expect(messages).toContain(first.reply)
    expect(messages).not.toContain('Hello again!')
  })

  it('invalidates cached greetings when the persona changes', async () => {
    const seen: unknown[] = []
    const harness = ctx.fx.harness(
      live,
      scripted([{ text: 'Welcome by the river.' }], seen)
    )
    const input = ask('Hello!', {
      intent: 'greet',
      worldContext: { ...worldContext, timeOfDay: 'night' },
    })
    await harness.interact('ba', input, ctx.playerId)
    const persona = NPC_PERSONAS.ba
    try {
      NPC_PERSONAS.ba += '\nTonight the river festival begins.'
      expect((await harness.interact('ba', input, ctx.playerId)).cached).toBe(
        false
      )
      expect(seen).toHaveLength(2)
    } finally {
      NPC_PERSONAS.ba = persona
    }
  })

  it('prewarms every missing NPC/time bucket and skips filled keys', async () => {
    const seen: unknown[] = []
    const harness = ctx.fx.harness(
      { ...live, model: 'prewarm-test-model' },
      scripted([{ text: 'Chào! Enjoy the neighborhood.' }], seen)
    )
    const bucketCount = Object.keys(NPCS).length * GREETING_BUCKETS.length
    expect(bucketCount).toBe(36)
    const first = await harness.prewarm()
    expect(first).toHaveLength(bucketCount)
    expect(first.every((line) => !line.cached && line.source === 'live')).toBe(
      true
    )
    expect(seen).toHaveLength(bucketCount)
    const second = await harness.prewarm()
    expect(second.every((line) => line.cached)).toBe(true)
    expect(seen).toHaveLength(bucketCount)
  })

  it('uses fallback without a model call when the daily budget is exhausted', async () => {
    let calls = 0
    const harness = ctx.fx.harness({ ...live, spendLimitUsd: 0 }, async () => {
      calls++
      throw new Error('should not call the provider')
    })
    const result = await harness.interact('tam', ask('Hello!'), ctx.playerId)
    expect(result.source).toBe('fallback')
    expect(calls).toBe(0)
    expect(harness.usage.calls).toBe(0)
  })

  it('serves the interact route and rejects unknown NPCs or bad input', async () => {
    const { token } = await ctx.fx.db.createGuest()
    const app = createApp(offline, fetch, ctx.fx)
    const post = (path: string, body: unknown) =>
      app.request(path, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })
    const ok = await post('/npc/hoa/interact', ask('hello', { intent: 'help' }))
    expect(await ok.json()).toMatchObject({
      npcId: 'hoa',
      source: 'fallback',
      degraded: false,
    })
    expect((await post('/npc/nobody/interact', ask('hello'))).status).toBe(404)
    expect(
      (await post('/npc/hoa/interact', { ...ask('hello'), playerId: 'x' }))
        .status
    ).toBe(400)
  })
})

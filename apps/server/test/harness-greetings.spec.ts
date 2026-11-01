import { LocaleSchema, NPCS } from '@saigon/shared'
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
  it('caches assistant-only greetings and includes the opening in the next live turn', async () => {
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
      ask('', {
        intent: 'greet',
        worldContext: { ...worldContext, timeOfDay: 'morning' },
      }),
      ctx.playerId
    )
    expect(first).toMatchObject({
      source: 'fallback',
      cached: false,
      party: null,
      toolCalls: [],
    })
    await harness.settleGreetings()
    expect(seen).toHaveLength(1)
    expect(seen[0]?.tools ?? []).toEqual([])
    const other = (await ctx.fx.guest()).player.id
    const cached = await harness.interact(
      'hoa',
      ask('', {
        intent: 'greet',
        worldContext: { ...worldContext, timeOfDay: 'morning' },
      }),
      other
    )
    expect(cached.cached).toBe(true)
    expect(cached.reply).toBe('Chào! Welcome to the warm market morning.')
    expect(seen).toHaveLength(1)
    await harness.interact('hoa', ask('Tell me about breakfast'), ctx.playerId)
    const messages = JSON.stringify(seen.at(-1)?.messages)
    expect(messages).toContain('Tell me about breakfast')
    expect(messages).toContain(first.reply)
    expect(messages).not.toContain('Hello, neighbor!')
  })

  it('caches greetings per language and asks for Vietnamese', async () => {
    const seen: { messages: unknown[] }[] = []
    const harness = ctx.fx.harness(
      live,
      scripted(
        [{ text: 'Chào buổi sáng!' }, { text: 'Good morning, neighbor!' }],
        seen
      )
    )
    const greet = (locale: 'en' | 'vi') =>
      ask('', {
        intent: 'greet',
        locale,
        worldContext: { ...worldContext, timeOfDay: 'morning' },
      })
    const vi = await harness.interact('mai', greet('vi'), ctx.playerId)
    const en = await harness.interact('mai', greet('en'), ctx.playerId)
    await harness.settleGreetings()
    expect(vi.cached).toBe(false)
    expect(en.cached).toBe(false)
    expect(seen).toHaveLength(2)
    expect(JSON.stringify(seen[0]?.messages)).toContain('southern Vietnamese')
    expect(JSON.stringify(seen[1]?.messages)).not.toContain(
      'southern Vietnamese'
    )
    expect(
      (await harness.interact('mai', greet('vi'), ctx.playerId)).reply
    ).toBe('Chào buổi sáng!')
  })

  it('adds the language rule to each live chat turn', async () => {
    const seen: { messages: unknown[] }[] = []
    const harness = ctx.fx.harness(
      live,
      scripted([{ text: 'Chợ hôm nay đông lắm con.' }], seen)
    )
    await harness.interact(
      'hoa',
      ask('Chợ hôm nay sao rồi?', { locale: 'vi' }),
      ctx.playerId
    )
    expect(JSON.stringify(seen.at(-1)?.messages)).toContain(
      'southern Vietnamese'
    )
  })

  it('uses Vietnamese fallbacks without a model', async () => {
    const harness = ctx.fx.harness(offline, async () => {
      throw new Error('should not call the provider')
    })
    const greeting = await harness.interact(
      'hoa',
      ask('', { intent: 'greet', locale: 'vi' }),
      ctx.playerId
    )
    expect(greeting.reply).toContain('buổi chiều')
    expect(greeting.reply).not.toContain('lovely')
    const help = await harness.interact(
      'hoa',
      ask('Cô có việc gì không?', { intent: 'help', locale: 'vi' }),
      ctx.playerId
    )
    expect(help.quests[0]?.title).toBe('Rau thơm cho hàng xóm')
    expect(help.reply).toContain('nhật ký')
  })

  it('does not cache a greeting cut off by the output limit', async () => {
    const harness = ctx.fx.harness(live, (async () =>
      Response.json({
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'Chào con! Good' },
            finish_reason: 'length',
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 4 },
      })) as typeof fetch)
    const greeting = await harness.interact(
      'hoa',
      ask('', { intent: 'greet' }),
      ctx.playerId
    )
    expect(greeting.source).toBe('fallback')
    expect(greeting.reply).not.toBe('Chào con! Good')
  })

  it('uses each affinity level and active city state in greeting keys', async () => {
    const harness = ctx.fx.harness(offline)
    harness.game.city = () => ({
      revision: 1,
      npcPlacements: {} as never,
      events: [
        {
          id: 'lantern-walk',
          kind: 'festival',
          locationId: 'cityhall',
          title: 'Lantern walk',
          description: 'Lanterns glow along the plaza.',
          startedAt: 0,
          endsAt: Date.now() + 60_000,
        },
      ],
      needs: {},
      weather: 'rain',
      headlines: [],
    })
    const before = await harness.interact(
      'hoa',
      ask('', { intent: 'greet' }),
      ctx.playerId
    )
    expect(before.reply).toContain('rainy')
    expect(before.reply).toContain('Lantern walk')
    await harness.game.adjustFriendship(ctx.playerId, 'hoa', 'warmer', 0)
    const after = await harness.interact(
      'hoa',
      ask('', { intent: 'greet' }),
      ctx.playerId
    )
    expect(after.friendship.hoa?.level).toBe(2)
    expect(after.reply).toContain('rainy')
  })

  it('invalidates cached greetings when the persona changes', async () => {
    const seen: unknown[] = []
    const harness = ctx.fx.harness(
      live,
      scripted([{ text: 'Welcome by the river.' }], seen)
    )
    const input = ask('', {
      intent: 'greet',
      worldContext: { ...worldContext, timeOfDay: 'night' },
    })
    await harness.interact('ba', input, ctx.playerId)
    await harness.settleGreetings()
    const persona = NPC_PERSONAS.ba
    try {
      NPC_PERSONAS.ba += '\nTonight the river festival begins.'
      expect((await harness.interact('ba', input, ctx.playerId)).cached).toBe(
        false
      )
      await harness.settleGreetings()
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
    const bucketCount =
      Object.keys(NPCS).length *
      GREETING_BUCKETS.length *
      LocaleSchema.options.length
    expect(bucketCount).toBe(232)
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
    const { token } = await ctx.fx.guest()
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

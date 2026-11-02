import { initialCitySnapshot, NPCS } from '@saigon/shared'
import { describe, expect, it } from 'vitest'
import { createApp } from '@/app'
import { ask, live, offline, scripted, setupNpc } from './support/npc'

const ctx = setupNpc()

describe('NPC encounter openings', () => {
  it.each(['open', 'greet'] as const)(
    'opens with %s without provider calls or spoken memory',
    async (intent) => {
      const seen: unknown[] = []
      const harness = ctx.fx.harness(
        live,
        scripted([{ text: 'Must not be generated.' }], seen)
      )
      for (const npcId of Object.keys(NPCS) as (keyof typeof NPCS)[]) {
        const response = await harness.interact(
          npcId,
          ask('', { intent }),
          ctx.playerId
        )
        expect(response.reply).toBe('')
        expect(response.messages).toEqual([])
        expect(response.toolCalls).toEqual([])
        expect(response.degraded).toBe(false)
        expect((await harness.history(npcId, ctx.playerId)).messages).toEqual(
          []
        )
      }
      expect(seen).toHaveLength(0)
      expect(harness.usage.calls).toBe(0)
    }
  )

  it('supplies current activity as observation, never prior speech, in a casual live turn', async () => {
    const seen: unknown[] = []
    const harness = ctx.fx.harness(
      live,
      scripted([{ text: 'These bowls are for breakfast.' }], seen)
    )
    harness.game.city = () => ({
      ...initialCitySnapshot(),
      npcActivities: {
        hoa: { activityId: 'busy', startedAt: 0, endsAt: Date.now() + 60_000 },
      },
    })
    await harness.interact('hoa', ask('', { intent: 'open' }), ctx.playerId)
    await harness.interact('hoa', ask('What food do you have?'), ctx.playerId)
    const body = JSON.stringify(seen.at(-1))
    expect(body).toContain('holding a warm bowl')
    expect(body).toContain('world observation, not something you said')
    expect(body).not.toContain('how you greeted them')
  })

  it('preserves message identity and separate submission/reply timestamps through history', async () => {
    const harness = ctx.fx.harness(offline)
    const sentAt = new Date(Date.now() - 120000).toISOString()
    const messageId = crypto.randomUUID()
    const response = await harness.interact(
      'hoa',
      ask('Can I help?', { sentAt, messageId }),
      ctx.playerId
    )
    expect(response.messages?.[0]).toMatchObject({
      role: 'user',
      at: sentAt,
    })
    expect(response.messages?.[0]?.id).toMatch(/^[a-f0-9]{64}$/)
    expect(Date.parse(response.messages?.[1]?.at ?? '')).toBeGreaterThan(
      Date.parse(sentAt)
    )
    expect((await harness.history('hoa', ctx.playerId)).messages).toEqual(
      response.messages
    )
    const other = await ctx.fx.guest()
    const otherReply = await harness.interact(
      'hoa',
      ask('A separate conversation.', { messageId, sentAt }),
      other.player.id
    )
    expect(otherReply.messages?.[0]?.id).not.toBe(response.messages?.[0]?.id)
    expect((await harness.history('hoa', ctx.playerId)).messages).toEqual(
      response.messages
    )
  })

  it('keeps Vietnamese chat and errand fallback behavior', async () => {
    const seen: unknown[] = []
    const harness = ctx.fx.harness(
      live,
      scripted([{ text: 'Chợ hôm nay đông lắm con.' }], seen)
    )
    await harness.interact(
      'hoa',
      ask('Chợ hôm nay sao rồi?', { locale: 'vi' }),
      ctx.playerId
    )
    expect(JSON.stringify(seen.at(-1))).toContain('southern Vietnamese')
    const fallback = ctx.fx.harness(offline)
    const response = await fallback.interact(
      'hoa',
      ask('Cô có việc gì không?', { intent: 'help', locale: 'vi' }),
      ctx.playerId
    )
    expect(response.reply).toContain('Trước tiên, hãy')
  })

  it('uses fallback without a model call when the daily budget is exhausted', async () => {
    const harness = ctx.fx.harness({ ...live, spendLimitUsd: 0 }, async () => {
      throw new Error('provider called')
    })
    const response = await harness.interact('tam', ask('Hello!'), ctx.playerId)
    expect(response.source).toBe('fallback')
    expect(harness.usage.calls).toBe(0)
  })

  it('serves open and rejects unknown NPCs or bad input', async () => {
    const { token } = await ctx.fx.guest()
    const app = createApp(offline, fetch, ctx.fx)
    try {
      const post = (path: string, body: unknown) =>
        app.request(path, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        })
      const response = await post(
        '/npc/hoa/interact',
        ask('', { intent: 'open' })
      )
      expect(response.status).toBe(200)
      expect(await response.json()).toMatchObject({ reply: '', messages: [] })
      expect((await post('/npc/nobody/interact', ask('hello'))).status).toBe(
        404
      )
      expect((await post('/npc/hoa/interact', ask(''))).status).toBe(400)
    } finally {
      app.realtime.manager.shutdown()
    }
  })
})

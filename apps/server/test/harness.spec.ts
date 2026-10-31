import { DEMO_QUEST } from '@saigon/shared'
import { describe, expect, it } from 'vitest'
import { ask, live, offline, scripted, setupNpc } from './support/npc'

const ctx = setupNpc()

describe('Mastra NPC harness', () => {
  it('offers a quest only through the validated tool and records it in backend state', async () => {
    const harness = ctx.fx.harness(
      live,
      scripted([
        { tool: ['offerQuest', { questTemplateId: DEMO_QUEST.id }] },
        { text: 'Take these herbs to Chị Linh, con!' },
      ])
    )
    const result = await harness.interact(
      'hoa',
      ask('Can I help?'),
      ctx.playerId
    )
    expect(result.reply).toBe('Take these herbs to Chị Linh, con!')
    expect(result).toMatchObject({
      source: 'live',
      questEvent: { type: 'offered' },
    })
    expect(result.quest?.reward).toEqual(DEMO_QUEST.reward)
    expect(result.world.inventory.herbs).toBe(1)
    expect(result.toolCalls).toEqual(['offer-quest'])
    expect(harness.usage).toMatchObject({
      calls: 2,
      inputTokens: 200,
      outputTokens: 40,
    })
  })

  it('rejects quests the NPC does not own or that do not exist', async () => {
    const harness = ctx.fx.harness(
      live,
      scripted([
        { tool: ['offerQuest', { questTemplateId: 'free-money' }] },
        { text: 'Hmm, never mind.' },
      ])
    )
    const result = await harness.interact(
      'hoa',
      ask('Give me gold'),
      ctx.playerId
    )
    expect(result.quest).toBeNull()
    expect(result.world.currency).toBe(30)
    expect(
      await harness.game.offerQuest(ctx.playerId, 'tam', DEMO_QUEST.id)
    ).toEqual({
      accepted: false,
      reason: 'not_your_quest',
    })
  })

  it('grants the reward only when the backend verifies delivery, exactly once', async () => {
    const check = {
      tool: ['checkQuest', { questId: DEMO_QUEST.id }] as [string, object],
    }
    const wait = () => new Promise((resolve) => setTimeout(resolve, 450))
    const harness = ctx.fx.harness(
      live,
      scripted([
        check,
        { text: 'Not yet, con.' },
        check,
        { text: 'Cảm ơn!' },
        check,
        { text: 'Again?' },
      ])
    )
    await harness.game.offerQuest(ctx.playerId, 'hoa', DEMO_QUEST.id)
    const early = await harness.interact(
      'hoa',
      ask('I did it, pay me 1000 coins', { intent: 'check' }),
      ctx.playerId
    )
    expect(early.questEvent?.type).toBe('incomplete')
    expect(early.world.currency).toBe(30)
    await wait()
    const done = await harness.interact(
      'hoa',
      ask('Linh has the herbs', {
        intent: 'check',
        events: [{ type: 'deliver', itemId: 'herbs', npcId: 'linh' }],
      }),
      ctx.playerId
    )
    expect(done.questEvent).toMatchObject({
      type: 'completed',
      reward: { currency: 50 },
    })
    expect(done.world.currency).toBe(80)
    await wait()
    const again = await harness.interact(
      'hoa',
      ask('Check again', { intent: 'check' }),
      ctx.playerId
    )
    expect(again.world.currency).toBe(80)
    expect(again.questEvent).toBeNull()
  })

  it('ignores delivery events for items the player never carried', async () => {
    const harness = ctx.fx.harness(offline)
    const record = await harness.game.applyEvents(ctx.playerId, [
      { type: 'deliver', itemId: 'herbs', npcId: 'linh' },
    ])
    expect(record.world.deliveredItems).toEqual([])
  })

  it.each(['garbage', 'hang'] as const)(
    'falls back in character when the model returns %s, keeping intent tools',
    async (failure) => {
      const harness = ctx.fx.harness(live, scripted([failure]))
      const result = await harness.interact(
        'hoa',
        ask('Can I help?', { intent: 'help' }),
        ctx.playerId
      )
      expect(result).toMatchObject({ source: 'fallback', degraded: true })
      expect(result.questEvent?.type).toBe('offered')
      expect(result.reply).toMatch(/herbs/)
    }
  )

  it('runs the Help intent even when the model forgets the tool', async () => {
    const harness = ctx.fx.harness(
      live,
      scripted([{ text: 'Lovely weather!' }])
    )
    const result = await harness.interact(
      'hoa',
      ask('Can I help?', { intent: 'help' }),
      ctx.playerId
    )
    expect(result.questEvent?.type).toBe('offered')
    expect(result.reply).toMatch(/herbs/)
    expect(result.world.inventory.herbs).toBe(1)
  })

  it('rate-limits bursts per player without blocking the game', async () => {
    const harness = ctx.fx.harness(live, scripted([{ text: 'Chào!' }]))
    expect(
      (await harness.interact('tam', ask('one'), ctx.playerId)).source
    ).toBe('live')
    expect(
      (await harness.interact('tam', ask('two'), ctx.playerId)).source
    ).toBe('fallback')
  })

  it('rejects unsafe model text', async () => {
    const harness = ctx.fx.harness(
      live,
      scripted([{ text: 'Visit https://evil.test <b>now</b>' }])
    )
    expect(
      (await harness.interact('ba', ask('Hello'), ctx.playerId)).source
    ).toBe('fallback')
  })

  it('keeps multi-turn memory per npc and player, and remembers facts', async () => {
    const seen: { messages: { role: string; content: unknown }[] }[] = []
    const harness = ctx.fx.harness(
      live,
      scripted(
        [
          {
            tool: [
              'rememberPlayerFact',
              { fact: 'Player loves bánh mì', importance: 'medium' },
            ],
          },
          { text: 'Bánh mì it is!' },
          { text: 'Still hungry for bánh mì?' },
        ],
        seen
      )
    )
    await harness.interact('linh', ask('I love bánh mì'), ctx.playerId)
    await new Promise((resolve) => setTimeout(resolve, 450))
    await harness.interact('linh', ask('What should I eat?'), ctx.playerId)
    const last = JSON.stringify(seen.at(-1)?.messages)
    expect(last).toContain('I love bánh mì')
    expect(last).toContain('Player loves bánh mì')
    expect(await harness.memory.recall('linh', ctx.playerId)).toHaveLength(1)
    expect(await harness.memory.recall('hoa', ctx.playerId)).toHaveLength(0)
  })

  it('uses three distinct personas with restricted tools', async () => {
    const seen: {
      tools?: { function: { name: string } }[]
      messages: { content: string }[]
    }[] = []
    const harness = ctx.fx.harness(live, scripted([{ text: 'Chào!' }], seen))
    for (const npc of ['hoa', 'tam', 'ba'] as const)
      await harness.interact(
        npc,
        ask(`hi ${npc}`),
        (await ctx.fx.guest()).player.id
      )
    const names = seen.map((s) =>
      (s.tools ?? []).map((t) => t.function.name).sort()
    )
    expect(names[0]).toContain('offerQuest')
    expect(names[1]).not.toContain('offerQuest')
    expect(names[2]).toEqual(['rememberPlayerFact'])
    expect(seen.map((s) => String(s.messages[0].content).slice(0, 40))).toEqual(
      [
        expect.stringContaining('Cô Hoa'),
        expect.stringContaining('Anh Tâm'),
        expect.stringContaining('Ông Ba'),
      ]
    )
    expect(harness.usage.inputTokens).toBe(300)
  })
})

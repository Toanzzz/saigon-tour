import { NPCS, rewardFor, seedsFor } from '@saigon/shared'
import { describe, expect, it } from 'vitest'
import { ask, live, offline, required, scripted, setupNpc } from './support/npc'

const ctx = setupNpc()
const seed = required(seedsFor('hoa')[0])

describe('NPC authored errands', () => {
  it('records a model-authored spec with server-generated id and reward', async () => {
    const spec = { ...seed, title: 'Fresh lunch on a busy street' }
    const harness = ctx.fx.harness(
      live,
      scripted([
        { tool: ['proposeQuest', spec] },
        { text: 'Take these herbs to Chị Linh, con!' },
      ])
    )
    const result = await harness.interact(
      'hoa',
      ask('Can I help?'),
      ctx.playerId
    )
    expect(result.source).toBe('live')
    expect(result.questEvents[0]?.type).toBe('offered')
    expect(result.quests[0]).toMatchObject({
      title: spec.title,
      reward: rewardFor(spec),
    })
    expect(result.quests[0]?.id).toMatch(/^q_/)
    expect(result.world.inventory.broth).toBe(1)
    expect(result.toolCalls).toEqual(['propose-quest'])
    expect(harness.usage).toMatchObject({
      calls: 2,
      inputTokens: 200,
      outputTokens: 40,
    })
  })

  it('lets models correct rejected proposals within three steps', async () => {
    const harness = ctx.fx.harness(
      live,
      scripted([
        {
          tool: [
            'proposeQuest',
            {
              ...seed,
              steps: [{ type: 'DELIVER', itemId: 'herbs', npcId: 'hoa' }],
            },
          ],
        },
        { tool: ['proposeQuest', seed] },
        { text: 'Linh is waiting in the park.' },
      ])
    )
    const result = await harness.interact(
      'hoa',
      ask('Any errands?'),
      ctx.playerId
    )
    expect(result.quests).toHaveLength(1)
    expect(result.toolCalls).toEqual(['propose-quest', 'propose-quest'])
  })

  it('rejects another giver and rewards only validated delivery, once under concurrent checks', async () => {
    const harness = ctx.fx.harness(offline)
    expect(
      await harness.game.proposeQuest(ctx.playerId, 'tam', seed)
    ).toMatchObject({ accepted: false, reason: 'not_your_quest' })
    await harness.game.proposeQuest(ctx.playerId, 'hoa', seed)
    expect((await harness.game.checkQuests(ctx.playerId, 'hoa'))[0]?.type).toBe(
      'incomplete'
    )
    await harness.game.applyEvents(ctx.playerId, [
      { type: 'deliver', itemId: 'broth', npcId: 'linh' },
    ])
    const results = await Promise.all(
      Array.from({ length: 12 }, () =>
        harness.game.checkQuests(ctx.playerId, 'hoa')
      )
    )
    expect(results.flat().filter((e) => e.type === 'completed')).toHaveLength(1)
    const save = await harness.game.get(ctx.playerId)
    // Final reward folds in the thrifty bonus (no spend on this route).
    expect(save.world.currency).toBe(
      30 + required(save.completed[0]).reward.currency
    )
    expect(save.quests).toEqual([])
    expect(save.completed).toHaveLength(1)
  })

  it('ignores delivery events when nothing is carried', async () => {
    const harness = ctx.fx.harness(offline)
    const save = await harness.game.applyEvents(ctx.playerId, [
      { type: 'deliver', itemId: 'herbs', npcId: 'linh' },
    ])
    expect(save.world.deliveredItems).toEqual([])
  })

  it.each(['garbage', 'hang'] as const)(
    'falls back on %s and executes help',
    async (failure) => {
      const harness = ctx.fx.harness(live, scripted([failure]))
      const result = await harness.interact(
        'hoa',
        ask('Can I help?', { intent: 'help' }),
        ctx.playerId
      )
      expect(result).toMatchObject({ source: 'fallback', degraded: true })
      expect(result.questEvents[0]?.type).toBe('offered')
    }
  )

  it('preserves a live reply without inventing a seed offer', async () => {
    const harness = ctx.fx.harness(
      live,
      scripted([{ text: 'Lovely weather!' }])
    )
    const response = await harness.interact(
      'hoa',
      ask('Any errands?', { intent: 'help' }),
      ctx.playerId
    )
    expect(response.reply).toBe('Lovely weather!')
    expect(response.source).toBe('live')
    expect(response.quests).toEqual([])
  })

  it('keeps memory scoped to NPC and player', async () => {
    const seen: { messages: unknown[] }[] = []
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
          { text: 'Still hungry?' },
        ],
        seen
      )
    )
    await harness.interact('linh', ask('I love bánh mì'), ctx.playerId)
    await new Promise((resolve) => setTimeout(resolve, 450))
    await harness.interact('linh', ask('What should I eat?'), ctx.playerId)
    expect(JSON.stringify(seen.at(-1)?.messages)).toContain(
      'Player loves bánh mì'
    )
    expect(await harness.memory.recall('hoa', ctx.playerId)).toEqual([])
  })

  it('equips all nine distinct personas with quest, context and memory tools', async () => {
    const seen: {
      tools?: { function: { name: string } }[]
      messages: { content: unknown }[]
    }[] = []
    const harness = ctx.fx.harness(live, scripted([{ text: 'Chào!' }], seen))
    for (const npc of Object.keys(NPCS) as (keyof typeof NPCS)[]) {
      const guest = await ctx.fx.guest()
      await harness.interact(npc, ask('Hello'), guest.player.id)
    }
    for (const body of seen) {
      expect(body.tools?.map((t) => t.function.name).sort()).toEqual([
        'adjustFriendliness',
        'dropQuest',
        'getContext',
        'proposeQuest',
        'rememberPlayerFact',
      ])
      expect(String(body.messages[0]?.content)).toContain(
        'Example valid quest spec:'
      )
    }
    expect(seen).toHaveLength(Object.keys(NPCS).length)
  })

  it('acknowledges an accepted errand and keeps the confirmation on revisit', async () => {
    const harness = ctx.fx.harness(offline)
    harness.game.city = () => ({
      revision: 1,
      npcPlacements: {
        vy: { locationId: 'cityhall', anchorId: 'vy', position: [64, 0, -18] },
      } as never,
      events: [
        {
          id: 'evening-gathering',
          kind: 'festival',
          locationId: 'cityhall',
          title: 'An evening gathering',
          description: 'Neighbors bring color to the City Hall walk.',
          startedAt: 0,
          endsAt: Date.now() + 60_000,
        },
      ],
      needs: { vy: 'Welcome walkers through the food alley.' },
      weather: 'clear',
      headlines: [],
    })
    await harness.interact('vy', ask('', { intent: 'greet' }), ctx.playerId)
    const accept = await harness.interact(
      'vy',
      ask('let me join'),
      ctx.playerId
    )
    const revisit = await harness.interact(
      'vy',
      ask('', { intent: 'greet' }),
      ctx.playerId
    )
    // The revisit greeting reflects the accepted errand, not the host pitch.
    expect(revisit.reply.toLowerCase()).toContain('taking this on')
    expect(revisit.reply.toLowerCase()).not.toContain('hosting')
    // The acceptance line survives: the greeting is appended, not overwritten.
    const { messages } = await harness.history('vy', ctx.playerId, 30)
    expect(messages.map((line) => line.text)).toContain(accept.reply)
    expect(messages.at(-1)?.text).toBe(revisit.reply)
  })

  it('greets as busy hosting when an event sits at the NPC location', async () => {
    const harness = ctx.fx.harness(offline)
    harness.game.city = () => ({
      revision: 1,
      npcPlacements: {
        vy: { locationId: 'cityhall', anchorId: 'vy', position: [64, 0, -18] },
      } as never,
      events: [
        {
          id: 'evening-gathering',
          kind: 'festival',
          locationId: 'cityhall',
          title: 'An evening gathering',
          description: 'Neighbors bring color to the City Hall walk.',
          startedAt: 0,
          endsAt: Date.now() + 60_000,
        },
      ],
      needs: { vy: 'Welcome walkers through the food alley.' },
      weather: 'clear',
      headlines: [],
    })
    const greeting = await harness.interact(
      'vy',
      ask('', { intent: 'greet' }),
      ctx.playerId
    )
    expect(greeting.reply).toContain('An evening gathering')
    expect(greeting.reply.toLowerCase()).toContain('hosting')
  })

  it('offers an errand when the player asks to join an active event', async () => {
    const harness = ctx.fx.harness(offline)
    await harness.interact('vy', ask('', { intent: 'greet' }), ctx.playerId)
    const result = await harness.interact(
      'vy',
      ask('let me join'),
      ctx.playerId
    )
    expect(result.questEvents[0]?.type).toBe('offered')
    expect(result.quests[0]?.giverNpcId).toBe('vy')
  })

  it('records each chat turn once even when the live reply is empty', async () => {
    const harness = ctx.fx.harness(live, scripted([{ text: '' }]))
    await harness.interact('vy', ask('', { intent: 'greet' }), ctx.playerId)
    for (let turn = 0; turn < 3; turn++)
      await harness.interact('vy', ask('let me join'), ctx.playerId)
    const { messages } = await harness.history('vy', ctx.playerId, 30)
    const users = messages.filter((line) => line.role === 'user')
    expect(users).toHaveLength(3)
    // No orphaned user runs: every user line is answered by an assistant line.
    for (let i = 0; i < messages.length - 1; i++)
      if (messages[i]?.role === 'user')
        expect(messages[i + 1]?.role).toBe('assistant')
  })

  it('rejects unsafe model text and limits player bursts', async () => {
    const harness = ctx.fx.harness(
      live,
      scripted([{ text: 'Visit https://evil.test <b>now</b>' }])
    )
    expect(
      (await harness.interact('ba', ask('Hello'), ctx.playerId)).source
    ).toBe('fallback')
    expect(
      (await harness.interact('ba', ask('Again'), ctx.playerId)).source
    ).toBe('fallback')
  })
})

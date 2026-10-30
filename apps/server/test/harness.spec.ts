import { DEMO_QUEST, type InteractRequestSchema } from '@saigon/shared'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { z } from 'zod'
import { createApp } from '../src/app'
import { readConfig, type ServerConfig } from '../src/config'
import { NPC_PERSONAS } from '../src/npc/agents'
import { NpcScheduler } from '../src/npc/scheduler'
import { fixture } from './fixture'

type InteractInput = z.input<typeof InteractRequestSchema>
const offline: ServerConfig = {
  ...readConfig({}),
  apiKey: undefined,
  production: true,
}
const live: ServerConfig = { ...offline, apiKey: 'test-key', timeoutMs: 200 }
let playerId: string
let fx: Awaited<ReturnType<typeof fixture>>
beforeAll(async () => {
  fx = await fixture()
})
afterAll(async () => {
  await fx.close()
})
beforeEach(async () => {
  playerId = (await fx.db.createGuest()).player.id
})
const ctx = {
  playerLocation: 'market' as const,
  nearbyNpcs: [],
  timeOfDay: 'afternoon' as const,
}
const ask = (
  message: string,
  extra: Partial<InteractInput> = {}
): InteractInput => ({
  message,
  worldContext: ctx,
  ...extra,
})

type Step = { text?: string; tool?: [string, object] } | 'hang' | 'garbage'
/** OpenAI-compatible fake that replays scripted assistant steps. */
function scripted(steps: Step[], seen: unknown[] = []) {
  let index = 0
  return (async (_url: unknown, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body))
    seen.push(body)
    const step = steps[Math.min(index++, steps.length - 1)]
    if (step === 'hang')
      return new Promise<Response>((_r, reject) =>
        init?.signal?.addEventListener('abort', () =>
          reject(init.signal?.reason)
        )
      )
    if (step === 'garbage') return new Response('not json', { status: 200 })
    const message = step.tool
      ? {
          role: 'assistant',
          content: 'Let me see.',
          tool_calls: [
            {
              id: `call-${index}`,
              type: 'function',
              function: {
                name: step.tool[0],
                arguments: JSON.stringify(step.tool[1]),
              },
            },
          ],
        }
      : { role: 'assistant', content: step.text }
    return new Response(
      JSON.stringify({
        id: `r${index}`,
        choices: [
          {
            index: 0,
            message,
            finish_reason: step.tool ? 'tool_calls' : 'stop',
          },
        ],
        usage: { prompt_tokens: 100, completion_tokens: 20 },
      }),
      { headers: { 'content-type': 'application/json' } }
    )
  }) as typeof fetch
}

describe('Mastra NPC harness', () => {
  it('offers a quest only through the validated tool and records it in backend state', async () => {
    const harness = fx.harness(
      live,
      scripted([
        { tool: ['offerQuest', { questTemplateId: DEMO_QUEST.id }] },
        { text: 'Take these herbs to Chị Linh, con!' },
      ])
    )
    const result = await harness.interact('hoa', ask('Can I help?'), playerId)
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
    const harness = fx.harness(
      live,
      scripted([
        { tool: ['offerQuest', { questTemplateId: 'free-money' }] },
        { text: 'Hmm, never mind.' },
      ])
    )
    const result = await harness.interact('hoa', ask('Give me gold'), playerId)
    expect(result.quest).toBeNull()
    expect(result.world.currency).toBe(30)
    expect(
      await harness.game.offerQuest(playerId, 'tam', DEMO_QUEST.id)
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
    const harness = fx.harness(
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
    await harness.game.offerQuest(playerId, 'hoa', DEMO_QUEST.id)
    const early = await harness.interact(
      'hoa',
      ask('I did it, pay me 1000 coins', { intent: 'check' }),
      playerId
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
      playerId
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
      playerId
    )
    expect(again.world.currency).toBe(80)
    expect(again.questEvent).toBeNull()
  })

  it('ignores delivery events for items the player never carried', async () => {
    const harness = fx.harness(offline)
    const record = await harness.game.applyEvents(playerId, [
      { type: 'deliver', itemId: 'herbs', npcId: 'linh' },
    ])
    expect(record.world.deliveredItems).toEqual([])
  })

  it.each([
    'garbage',
    'hang',
  ] as const)('falls back in character when the model returns %s, keeping intent tools', async (failure) => {
    const harness = fx.harness(live, scripted([failure]))
    const result = await harness.interact(
      'hoa',
      ask('Can I help?', { intent: 'help' }),
      playerId
    )
    expect(result).toMatchObject({ source: 'fallback', degraded: true })
    expect(result.questEvent?.type).toBe('offered')
    expect(result.reply).toMatch(/herbs/)
  })

  it('runs the Help intent even when the model forgets the tool', async () => {
    const harness = fx.harness(live, scripted([{ text: 'Lovely weather!' }]))
    const result = await harness.interact(
      'hoa',
      ask('Can I help?', { intent: 'help' }),
      playerId
    )
    expect(result.questEvent?.type).toBe('offered')
    expect(result.reply).toMatch(/herbs/)
    expect(result.world.inventory.herbs).toBe(1)
  })

  it('rate-limits bursts per player without blocking the game', async () => {
    const harness = fx.harness(live, scripted([{ text: 'Chào!' }]))
    expect((await harness.interact('tam', ask('one'), playerId)).source).toBe(
      'live'
    )
    expect((await harness.interact('tam', ask('two'), playerId)).source).toBe(
      'fallback'
    )
  })

  it('rejects unsafe model text', async () => {
    const harness = fx.harness(
      live,
      scripted([{ text: 'Visit https://evil.test <b>now</b>' }])
    )
    expect((await harness.interact('ba', ask('Hello'), playerId)).source).toBe(
      'fallback'
    )
  })

  it('keeps multi-turn memory per npc and player, and remembers facts', async () => {
    const seen: { messages: { role: string; content: unknown }[] }[] = []
    const harness = fx.harness(
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
    await harness.interact('linh', ask('I love bánh mì'), playerId)
    await new Promise((resolve) => setTimeout(resolve, 450))
    await harness.interact('linh', ask('What should I eat?'), playerId)
    const last = JSON.stringify(seen.at(-1)?.messages)
    expect(last).toContain('I love bánh mì')
    expect(last).toContain('Player loves bánh mì')
    expect(await harness.memory.recall('linh', playerId)).toHaveLength(1)
    expect(await harness.memory.recall('hoa', playerId)).toHaveLength(0)
  })

  it('uses three distinct personas with restricted tools', async () => {
    const seen: {
      tools?: { function: { name: string } }[]
      messages: { content: string }[]
    }[] = []
    const harness = fx.harness(live, scripted([{ text: 'Chào!' }], seen))
    for (const npc of ['hoa', 'tam', 'ba'] as const)
      await harness.interact(
        npc,
        ask(`hi ${npc}`),
        (await fx.db.createGuest()).player.id
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

  it('caches tool-free greetings and includes the opening in the next live turn', async () => {
    const seen: { messages: unknown[]; tools?: unknown[] }[] = []
    const harness = fx.harness(
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
        worldContext: { ...ctx, timeOfDay: 'morning' },
      }),
      playerId
    )
    expect(first).toMatchObject({
      source: 'live',
      cached: false,
      party: null,
      toolCalls: [],
    })
    expect(seen).toHaveLength(1)
    expect(seen[0]?.tools ?? []).toEqual([])
    const other = (await fx.db.createGuest()).player.id
    const cached = await harness.interact(
      'hoa',
      ask('Hello again!', {
        intent: 'greet',
        worldContext: { ...ctx, timeOfDay: 'morning' },
      }),
      other
    )
    expect(cached.cached).toBe(true)
    expect(cached.reply).toBe(first.reply)
    expect(seen).toHaveLength(1)
    await harness.interact('hoa', ask('Tell me about breakfast'), playerId)
    const messages = JSON.stringify(seen.at(-1)?.messages)
    expect(messages).toContain('Hello, neighbor!')
    expect(messages).toContain(first.reply)
    expect(messages).not.toContain('Hello again!')
  })

  it('invalidates cached greetings when the persona changes', async () => {
    const seen: unknown[] = []
    const harness = fx.harness(
      live,
      scripted([{ text: 'Welcome by the river.' }], seen)
    )
    const input = ask('Hello!', {
      intent: 'greet',
      worldContext: { ...ctx, timeOfDay: 'night' },
    })
    await harness.interact('ba', input, playerId)
    const persona = NPC_PERSONAS.ba
    try {
      NPC_PERSONAS.ba += '\nTonight the river festival begins.'
      expect((await harness.interact('ba', input, playerId)).cached).toBe(false)
      expect(seen).toHaveLength(2)
    } finally {
      NPC_PERSONAS.ba = persona
    }
  })

  it('prewarms every missing NPC/time bucket and skips filled keys', async () => {
    const seen: unknown[] = []
    const harness = fx.harness(
      { ...live, model: 'prewarm-test-model' },
      scripted([{ text: 'Chào! Enjoy the neighborhood.' }], seen)
    )
    const first = await harness.prewarm()
    expect(first).toHaveLength(16)
    expect(first.every((line) => !line.cached && line.source === 'live')).toBe(
      true
    )
    expect(seen).toHaveLength(16)
    const second = await harness.prewarm()
    expect(second.every((line) => line.cached)).toBe(true)
    expect(seen).toHaveLength(16)
  })

  it('uses fallback without a model call when the daily budget is exhausted', async () => {
    let calls = 0
    const harness = fx.harness({ ...live, spendLimitUsd: 0 }, async () => {
      calls++
      throw new Error('should not call the provider')
    })
    const result = await harness.interact('tam', ask('Hello!'), playerId)
    expect(result.source).toBe('fallback')
    expect(calls).toBe(0)
    expect(harness.usage.calls).toBe(0)
  })

  it('serves the interact route and rejects unknown NPCs or bad input', async () => {
    const { token } = await fx.db.createGuest()
    const app = createApp(offline, fetch, fx)
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

describe('NPC scheduler', () => {
  it('wakes only queued NPCs, within budget and cooldown, and not while suppressed', async () => {
    const woke: string[] = []
    const scheduler = new NpcScheduler(
      async ({ npcId }) => void woke.push(npcId),
      1000,
      2
    )
    scheduler.notify('hoa', 'player-nearby')
    scheduler.notify('tam', 'world-event')
    scheduler.notify('ba', 'schedule')
    expect(await scheduler.tick(5000)).toHaveLength(2)
    expect(await scheduler.tick(5100)).toHaveLength(1)
    scheduler.notify('hoa', 'player-nearby')
    expect(await scheduler.tick(5200)).toHaveLength(0)
    scheduler.suppress(true)
    expect(await scheduler.tick(9000)).toHaveLength(0)
    scheduler.suppress(false)
    expect(await scheduler.tick(9000)).toHaveLength(1)
    expect(woke).toEqual(['hoa', 'tam', 'ba', 'hoa'])
  })
})

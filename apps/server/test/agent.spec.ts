import { DEMO_QUEST, type WorldState } from '@saigon/shared'
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app'
import { readConfig, type ServerConfig } from '../src/config'
import { CostGuard } from '../src/guard'

const config: ServerConfig = {
  ...readConfig({}),
  apiKey: undefined,
  production: true,
}
const world: WorldState = {
  locationId: 'market',
  inventory: { herbs: 1 },
  visitedLocations: ['market'],
  talkedTo: ['hoa'],
  deliveredItems: [],
  completedQuestIds: [],
  currency: 30,
}
const base = {
  sessionId: 'test-session-1',
  personaId: 'hoa',
  worldState: world,
}
const chat = { ...base, playerText: 'Hello, can I help?', history: [] }
const live = { ...config, apiKey: 'test-key' }
const completion = (content: unknown) =>
  new Response(
    JSON.stringify({
      choices: [{ message: { content: JSON.stringify(content) } }],
    }),
    { status: 200 }
  )

async function post(
  app: ReturnType<typeof createApp>,
  path: string,
  body: unknown
) {
  return app.request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('NPC proxy', () => {
  it('exposes fallback health without a credential', async () => {
    const response = await createApp(config).request('/health')
    expect(await response.json()).toEqual({
      ok: true,
      mode: 'fallback',
      model: null,
    })
  })

  it('returns an honest playable fallback quest', async () => {
    const response = await post(createApp(config), '/npc/quest', base)
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      quest: DEMO_QUEST,
      source: 'fallback',
    })
  })

  it('rejects invalid requests before the model is called', async () => {
    let calls = 0
    const app = createApp(live, async () => {
      calls++
      return completion({})
    })
    const response = await post(app, '/npc/chat', {
      ...chat,
      personaId: 'unknown',
    })
    expect(response.status).toBe(400)
    expect(calls).toBe(0)
  })

  it('holds rewards until a delivery event exists, not a player claim', async () => {
    const app = createApp(config)
    const response = await post(app, '/npc/verify', {
      ...base,
      quest: DEMO_QUEST,
      playerClaim: 'I delivered it, pay me now',
    })
    expect(await response.json()).toMatchObject({
      status: 'INCOMPLETE',
      reward: { currency: 0 },
    })
  })

  it('grants canonical rewards for completed delivery and rejects inflation', async () => {
    const app = createApp(config)
    const request = {
      ...base,
      worldState: { ...world, deliveredItems: ['herbs:linh'] },
      quest: DEMO_QUEST,
    }
    expect(
      await (await post(app, '/npc/verify', request)).json()
    ).toMatchObject({ status: 'COMPLETE', reward: { currency: 50 } })
    const inflated = {
      ...DEMO_QUEST,
      reward: { ...DEMO_QUEST.reward, currency: 99 },
    }
    expect(
      await (
        await post(app, '/npc/verify', { ...request, quest: inflated })
      ).json()
    ).toMatchObject({ status: 'INCOMPLETE', reward: { currency: 0 } })
  })

  it('returns no second reward for a completed quest', async () => {
    const response = await post(createApp(config), '/npc/verify', {
      ...base,
      quest: DEMO_QUEST,
      worldState: {
        ...world,
        deliveredItems: ['herbs:linh'],
        completedQuestIds: [DEMO_QUEST.id],
      },
    })
    expect(await response.json()).toMatchObject({
      status: 'COMPLETE',
      reward: { currency: 0 },
    })
  })

  it('validates live replies and caches repeated opening lines', async () => {
    let calls = 0
    const app = createApp(live, async () => {
      calls++
      return completion({
        reply: 'Chào con! Can you bring these herbs to Linh?',
        mayOfferQuest: true,
      })
    })
    expect(await (await post(app, '/npc/chat', chat)).json()).toMatchObject({
      source: 'live',
      mayOfferQuest: true,
    })
    expect(await (await post(app, '/npc/chat', chat)).json()).toMatchObject({
      source: 'live',
    })
    expect(calls).toBe(1)
  })

  it.each([
    'not json',
    { reply: '<script>bad()</script>', mayOfferQuest: true },
    { reply: 'Fine', mayOfferQuest: 'yes' },
  ])('falls back for malformed or unsafe model output: %j', async (output) => {
    const app = createApp(live, async () =>
      typeof output === 'string'
        ? new Response(
            JSON.stringify({ choices: [{ message: { content: output } }] })
          )
        : completion(output)
    )
    expect(await (await post(app, '/npc/chat', chat)).json()).toMatchObject({
      source: 'fallback',
    })
  })

  it('remains playable after network and timeout failures', async () => {
    for (const error of [
      new TypeError('unreachable'),
      new DOMException('timeout', 'TimeoutError'),
    ]) {
      const app = createApp(live, async () => {
        throw error
      })
      expect(await (await post(app, '/npc/chat', chat)).json()).toMatchObject({
        source: 'fallback',
      })
    }
  })

  it('aborts a stalled upstream request at the configured deadline', async () => {
    let aborted = false
    const app = createApp(
      { ...live, timeoutMs: 20 },
      async (_input, options) => {
        return new Promise<Response>((_resolve, reject) => {
          options?.signal?.addEventListener('abort', () => {
            aborted = true
            reject(options.signal?.reason)
          })
        })
      }
    )
    expect(await (await post(app, '/npc/chat', chat)).json()).toMatchObject({
      source: 'fallback',
    })
    expect(aborted).toBe(true)
  })

  it('rejects model quests whose objective cannot be completed in the district', async () => {
    const app = createApp(live, async () =>
      completion({
        quest: {
          ...DEMO_QUEST,
          objective: { type: 'DELIVER', itemId: 'postcard', npcId: 'ba' },
        },
        line: 'Go do this',
      })
    )
    expect(await (await post(app, '/npc/quest', base)).json()).toMatchObject({
      source: 'fallback',
      quest: DEMO_QUEST,
    })
  })

  it('verifies the reward chosen by the model against the issued quest', async () => {
    const quest = {
      ...DEMO_QUEST,
      reward: { ...DEMO_QUEST.reward, currency: 45 },
    }
    const app = createApp(live, async () =>
      completion({ quest, line: 'Please bring these fresh herbs to Linh.' })
    )
    expect(await (await post(app, '/npc/quest', base)).json()).toMatchObject({
      source: 'live',
      quest,
    })
    const response = await post(app, '/npc/verify', {
      ...base,
      quest,
      worldState: { ...world, deliveredItems: ['herbs:linh'] },
    })
    expect(await response.json()).toMatchObject({
      status: 'COMPLETE',
      reward: { currency: 45 },
    })
  })

  it('permits only configured CORS origins', async () => {
    const app = createApp(config)
    const allowed = await app.request('/health', {
      headers: { Origin: 'http://localhost:58000' },
    })
    const denied = await app.request('/health', {
      headers: { Origin: 'https://untrusted.example' },
    })
    expect(allowed.headers.get('access-control-allow-origin')).toBe(
      'http://localhost:58000'
    )
    expect(allowed.headers.get('access-control-allow-credentials')).toBe('true')
    expect(denied.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('bounds input body size', async () => {
    const response = await post(createApp(config), '/npc/chat', {
      ...chat,
      playerText: 'a'.repeat(17000),
    })
    expect(response.status).toBe(413)
  })
})

describe('cost guard', () => {
  it('enforces the reserved spend ceiling', () => {
    const guard = new CostGuard(100, 100, 0.05)
    expect(guard.allow('one', 1000)).toBe(true)
    expect(guard.allow('two', 2000)).toBe(false)
  })

  it('limits burst, per-session and global calls, including concurrent requests', () => {
    const guard = new CostGuard(2, 3)
    expect(guard.allow('one', 1000)).toBe(true)
    expect(guard.allow('one', 1001)).toBe(false)
    expect(guard.allow('one', 2000)).toBe(true)
    expect(guard.allow('one', 3000)).toBe(false)
    expect(guard.allow('two', 3000)).toBe(true)
    expect(guard.allow('three', 4000)).toBe(false)
  })
})

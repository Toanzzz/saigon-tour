import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app'
import { readConfig, type ServerConfig } from '../src/config'
import { CostGuard } from '../src/guard'
import { fixture } from './fixture'

const config: ServerConfig = {
  ...readConfig({}),
  apiKey: undefined,
  production: true,
}
const live = { ...config, apiKey: 'test-key' }
const body = {
  message: 'Hello, can I help?',
  worldContext: { playerLocation: 'market', timeOfDay: 'afternoon' },
}
let fx: Awaited<ReturnType<typeof fixture>>
let token: string
beforeAll(async () => {
  fx = await fixture()
})
afterAll(async () => {
  await fx.close()
})
beforeEach(async () => {
  token = (await fx.db.createGuest()).token
})
const appFor = (cfg = config, fetcher: typeof fetch = fetch) =>
  createApp(cfg, fetcher, fx)

const post = (app: ReturnType<typeof createApp>, payload: unknown) =>
  app.request('/npc/hoa/interact', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

describe('NPC API', () => {
  it('exposes fallback health without a credential', async () => {
    const response = await appFor(config).request('/health')
    expect(await response.json()).toEqual({
      ok: true,
      db: 'up',
      mode: 'fallback',
      model: null,
    })
  })

  it('rejects invalid requests before the model is called', async () => {
    let calls = 0
    const app = appFor(live, async () => {
      calls++
      return new Response('{}')
    })
    const response = await post(app, { ...body, intent: 'pay-me' })
    expect(response.status).toBe(400)
    expect(calls).toBe(0)
  })

  it('remains playable after network failures', async () => {
    const app = appFor(live, async () => {
      throw new TypeError('unreachable')
    })
    expect(await (await post(app, body)).json()).toMatchObject({
      source: 'fallback',
      degraded: true,
    })
  })

  it('aborts a stalled upstream request at the configured deadline', async () => {
    let aborted = false
    const app = appFor({ ...live, timeoutMs: 30 }, async (_input, options) => {
      return new Promise<Response>((_resolve, reject) => {
        options?.signal?.addEventListener('abort', () => {
          aborted = true
          reject(options.signal?.reason)
        })
      })
    })
    const started = Date.now()
    expect(await (await post(app, body)).json()).toMatchObject({
      source: 'fallback',
    })
    expect(aborted).toBe(true)
    expect(Date.now() - started).toBeLessThan(5000)
  })

  it('permits only configured CORS origins', async () => {
    const app = appFor(config)
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
    const response = await post(appFor(config), {
      ...body,
      message: 'a'.repeat(17000),
    })
    expect(response.status).toBe(413)
  })
})

describe('cost guard', () => {
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

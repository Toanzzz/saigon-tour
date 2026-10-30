import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app'
import { readConfig, type ServerConfig } from '../src/config'
import { CostGuard } from '../src/guard'

const config: ServerConfig = {
  ...readConfig({}),
  apiKey: undefined,
  production: true,
}
const live = { ...config, apiKey: 'test-key' }
const body = {
  playerId: 'test-session-1',
  message: 'Hello, can I help?',
  worldContext: { playerLocation: 'market', timeOfDay: 'afternoon' },
}
const post = (app: ReturnType<typeof createApp>, payload: unknown) =>
  app.request('/npc/hoa/interact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

describe('NPC API', () => {
  it('exposes fallback health without a credential', async () => {
    const response = await createApp(config).request('/health')
    expect(await response.json()).toEqual({
      ok: true,
      mode: 'fallback',
      model: null,
    })
  })

  it('rejects invalid requests before the model is called', async () => {
    let calls = 0
    const app = createApp(live, async () => {
      calls++
      return new Response('{}')
    })
    const response = await post(app, { ...body, intent: 'pay-me' })
    expect(response.status).toBe(400)
    expect(calls).toBe(0)
  })

  it('remains playable after network failures', async () => {
    const app = createApp(live, async () => {
      throw new TypeError('unreachable')
    })
    expect(await (await post(app, body)).json()).toMatchObject({
      source: 'fallback',
      degraded: true,
    })
  })

  it('aborts a stalled upstream request at the configured deadline', async () => {
    let aborted = false
    const app = createApp(
      { ...live, timeoutMs: 30 },
      async (_input, options) => {
        return new Promise<Response>((_resolve, reject) => {
          options?.signal?.addEventListener('abort', () => {
            aborted = true
            reject(options.signal?.reason)
          })
        })
      }
    )
    const started = Date.now()
    expect(await (await post(app, body)).json()).toMatchObject({
      source: 'fallback',
    })
    expect(aborted).toBe(true)
    expect(Date.now() - started).toBeLessThan(5000)
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
    const response = await post(createApp(config), {
      ...body,
      message: 'a'.repeat(17000),
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

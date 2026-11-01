import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '@/app'
import { readConfig } from '@/shared'
import { fixture } from './fixture'

let fx: Awaited<ReturnType<typeof fixture>>
const config = { ...readConfig({}), production: true }
beforeAll(async () => {
  fx = await fixture()
})
afterAll(async () => {
  await fx.close()
})
const headers = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
})

describe('POST /me/profile', () => {
  it('round-trips the chosen name and body', async () => {
    const app = createApp(config, fetch, fx)
    const { token } = await fx.guest()
    const response = await app.request('/me/profile', {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({ name: 'Linh', body: 'woman' }),
    })
    expect(response.status).toBe(200)
    const { player } = await response.json()
    expect(player.name).toBe('Linh')
    expect(player.body).toBe('woman')
  })

  it('defaults the body to man when omitted', async () => {
    const app = createApp(config, fetch, fx)
    const { token } = await fx.guest()
    const response = await app.request('/me/profile', {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({ name: 'An' }),
    })
    expect(response.status).toBe(200)
    expect((await response.json()).player.body).toBe('man')
  })

  it('keeps the body through a reset', async () => {
    const app = createApp(config, fetch, fx)
    const { token } = await fx.guest()
    await app.request('/me/profile', {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({ name: 'Mai', body: 'woman' }),
    })
    const reset = await app.request('/me/reset', {
      method: 'POST',
      headers: headers(token),
    })
    expect(reset.status).toBe(200)
    expect((await reset.json()).player.body).toBe('woman')
  })

  it('rejects an unknown body', async () => {
    const app = createApp(config, fetch, fx)
    const { token } = await fx.guest()
    const response = await app.request('/me/profile', {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({ name: 'An', body: 'alien' }),
    })
    expect(response.status).toBe(400)
  })
})

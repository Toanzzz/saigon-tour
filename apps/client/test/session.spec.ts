import { DEMO_QUEST } from '@saigon/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { initialState } from '../src/state/game'

const saved = {
  id: 'b258d475-4914-409d-bc43-e38d6137dc92',
  name: 'Sóc Nắng 27',
  color: '#ddaa77',
  world: { ...initialState().world, currency: 80 },
  quest: null,
  completed: [DEMO_QUEST],
  reputation: 1,
}
let storage: Map<string, string>
let fetchMock: ReturnType<typeof vi.fn>
let game: typeof import('../src/state/game').game
let update: typeof import('../src/state/game').update
beforeEach(async () => {
  vi.resetModules()
  const state = await import('../src/state/game')
  game = state.game
  update = state.update
  storage = new Map()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  })
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  game.setState(() => initialState())
})
afterEach(() => vi.unstubAllGlobals())

describe('guest sessions', () => {
  it('creates a guest and stores its token for authorized requests', async () => {
    const session = await import('../src/net/session')
    fetchMock.mockResolvedValue(
      Response.json({ token: 'secret-guest-token', player: saved })
    )
    await session.initializeSession()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/guest',
      expect.objectContaining({ method: 'POST' })
    )
    expect(storage.get(session.GUEST_TOKEN_KEY)).toBe('secret-guest-token')
    expect(session.authorizationHeaders()).toEqual({
      Authorization: 'Bearer secret-guest-token',
    })
    expect(game.state.guestStatus).toBe('online')
    expect(game.state.returningGuest).toBe(false)
  })
  it('hydrates saved progress, replaying events observed during loading', async () => {
    const session = await import('../src/net/session')
    storage.set(session.GUEST_TOKEN_KEY, 'existing-token')
    let resolve!: (response: Response) => void
    fetchMock.mockReturnValue(
      new Promise<Response>((done) => {
        resolve = done
      })
    )
    const loading = session.initializeSession()
    update({ pending: [{ type: 'spend', amount: 5 }] })
    resolve(Response.json({ player: saved }))
    await loading
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/me',
      expect.objectContaining({
        headers: { Authorization: 'Bearer existing-token' },
      })
    )
    expect(game.state.world.currency).toBe(75)
    expect(game.state.completed).toEqual([DEMO_QUEST])
    expect(game.state.guestName).toBe(saved.name)
    expect(game.state.returningGuest).toBe(true)
    expect(game.state.pending).toHaveLength(1)
  })
  it('keeps the token and current world when the server is unavailable', async () => {
    const session = await import('../src/net/session')
    storage.set(session.GUEST_TOKEN_KEY, 'existing-token')
    fetchMock.mockRejectedValue(new TypeError('Network unavailable'))
    await session.initializeSession()
    expect(game.state.guestStatus).toBe('offline')
    expect(game.state.world).toEqual(initialState().world)
    expect(storage.get(session.GUEST_TOKEN_KEY)).toBe('existing-token')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
  it('replaces an expired guest only after a 401', async () => {
    const session = await import('../src/net/session')
    storage.set(session.GUEST_TOKEN_KEY, 'expired')
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(
        Response.json({ token: 'replacement', player: saved })
      )
    await session.initializeSession()
    expect(storage.get(session.GUEST_TOKEN_KEY)).toBe('replacement')
    expect(game.state.returningGuest).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
  it('resets through the authenticated endpoint without replacing the token', async () => {
    const session = await import('../src/net/session')
    storage.set(session.GUEST_TOKEN_KEY, 'existing-token')
    const player = { ...saved, world: initialState().world, completed: [] }
    fetchMock.mockResolvedValue(Response.json({ player }))
    expect(await session.resetSession()).toEqual(player)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/me/reset',
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'Bearer existing-token' },
      })
    )
    expect(storage.get(session.GUEST_TOKEN_KEY)).toBe('existing-token')
  })
})

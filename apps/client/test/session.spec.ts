import { completedFixture, questFixture } from './quest-fixture'

const completed = completedFixture(questFixture())

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { initialState } from '@/shared/state/game'

const saved = {
  friendship: {},
  revision: 7,
  id: 'b258d475-4914-409d-bc43-e38d6137dc92',
  name: 'Emma Clarke',
  body: 'man',
  color: '#ddaa77',
  world: { ...initialState().world, currency: 80 },
  quests: [],
  completed: [completed],
  reputation: 1,
  unlocks: { owned: [], equipped: {} },
}
let storage: Map<string, string>
let fetchMock: ReturnType<typeof vi.fn>
let transport: typeof import('@/shared/api/transport')
let game: typeof import('@/shared/state/game').game
let update: typeof import('@/shared/state/game').update
beforeEach(async () => {
  vi.resetModules()
  const state = await import('@/shared/state/game')
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
  transport = await import('@/shared/api/transport')
  game.setState(() => initialState())
})
afterEach(() => vi.unstubAllGlobals())

const anonymous = { player: saved, account: { anonymous: true } }
const urlOf = (call: unknown[]) => String(call[0])

describe('auth sessions', () => {
  it('replays quest progress observed while saved progress loads', async () => {
    const session = await import('@/shared/api/session')
    transport.saveToken('existing-token')
    const quest = questFixture('vy')
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith('/auth/providers')
        ? Response.json({ meta: false })
        : Response.json({
            player: { ...saved, quests: [quest] },
            account: { anonymous: true },
          })
    )
    update({ pending: [{ type: 'visit', locationId: 'alley' }] })
    await session.initializeSession()
    expect(game.state.world.locationId).toBe('alley')
    expect(game.state.quests[0]?.status).toBe('ready')
  })
  it('signs in anonymously and stores the session token for authorized requests', async () => {
    const session = await import('@/shared/api/session')
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith('/auth/providers')) return Response.json({ meta: true })
      if (url.endsWith('/auth/sign-in/anonymous'))
        return Response.json({ token: 'session-token', user: {} })
      return Response.json(anonymous)
    })
    await session.initializeSession()
    const signIn = fetchMock.mock.calls.find((call) =>
      urlOf(call).endsWith('/auth/sign-in/anonymous')
    )
    expect(signIn?.[1]).toMatchObject({
      method: 'POST',
      credentials: 'include',
    })
    expect(transport.sessionToken()).toBe('session-token')
    expect(session.authorizationHeaders()).toEqual({
      Authorization: 'Bearer session-token',
    })
    expect(game.state.guestStatus).toBe('online')
    expect(game.state.account).toBe('anonymous')
    expect(game.state.metaAvailable).toBe(true)
    expect(game.state.returningGuest).toBe(false)
  })
  it('hydrates saved progress, replaying events observed during loading', async () => {
    const session = await import('@/shared/api/session')
    transport.saveToken('existing-token')
    let resolve!: (response: Response) => void
    fetchMock.mockImplementation((url: string) =>
      url.endsWith('/auth/providers')
        ? Promise.resolve(Response.json({ meta: false }))
        : new Promise<Response>((done) => {
            resolve = done
          })
    )
    const loading = session.initializeSession()
    update({ pending: [{ type: 'spend', amount: 5 }] })
    await vi.waitFor(() => expect(resolve).toBeTypeOf('function'))
    resolve(Response.json({ player: saved, account: { anonymous: false } }))
    await loading
    const me = fetchMock.mock.calls.find((call) =>
      urlOf(call).endsWith('/api/me')
    ) as [string, RequestInit]
    expect(new Headers(me[1].headers).get('Authorization')).toBe(
      'Bearer existing-token'
    )
    expect(game.state.serverRevision).toBe(7)
    expect(game.state.world.currency).toBe(75)
    expect(game.state.completed).toEqual([completed])
    expect(game.state.guestName).toBe(saved.name)
    expect(game.state.account).toBe('meta')
    expect(game.state.returningGuest).toBe(true)
    expect(game.state.pending).toHaveLength(1)
  })
  it('adopts the cookie session after the Meta redirect', async () => {
    const session = await import('@/shared/api/session')
    vi.stubGlobal('location', new URL('http://127.0.0.1:58000/?signedIn=meta'))
    const replaceState = vi.fn()
    vi.stubGlobal('history', { state: null, replaceState })
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith('/auth/providers')) return Response.json({ meta: true })
      if (url.endsWith('/auth/get-session'))
        return Response.json({ session: { token: 'meta-token' }, user: {} })
      return Response.json({ player: saved, account: { anonymous: false } })
    })
    await session.initializeSession()
    expect(transport.sessionToken()).toBe('meta-token')
    expect(String(replaceState.mock.calls[0]?.[2])).not.toContain('signedIn')
    expect(game.state.account).toBe('meta')
  })
  it('keeps the token and current world when the server is unavailable', async () => {
    const session = await import('@/shared/api/session')
    transport.saveToken('existing-token')
    fetchMock.mockRejectedValue(new TypeError('Network unavailable'))
    await session.initializeSession()
    expect(game.state.guestStatus).toBe('offline')
    expect(game.state.world).toEqual(initialState().world)
    expect(transport.sessionToken()).toBe('existing-token')
  })
  it('starts a new anonymous session only after a 401', async () => {
    const session = await import('@/shared/api/session')
    transport.saveToken('expired')
    let me = 0
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith('/auth/providers')) return Response.json({ meta: false })
      if (url.endsWith('/auth/sign-in/anonymous'))
        return Response.json({ token: 'replacement', user: {} })
      return me++ === 0
        ? new Response(null, { status: 401 })
        : Response.json(anonymous)
    })
    await session.initializeSession()
    expect(transport.sessionToken()).toBe('replacement')
    expect(game.state.returningGuest).toBe(false)
  })
  it('saves the profile through the authenticated endpoint', async () => {
    const session = await import('@/shared/api/session')
    transport.saveToken('existing-token')
    fetchMock.mockResolvedValue(
      Response.json({ player: { ...saved, name: 'Cô Lan', body: 'woman' } })
    )
    const result = await session.saveProfile('Cô Lan', 'woman')
    expect(result.name).toBe('Cô Lan')
    expect(result.body).toBe('woman')
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/me/profile')
    expect(JSON.parse(String(init.body))).toEqual({
      name: 'Cô Lan',
      body: 'woman',
    })
  })
  it('resets through the authenticated endpoint without replacing the token', async () => {
    const session = await import('@/shared/api/session')
    transport.saveToken('existing-token')
    const player = { ...saved, world: initialState().world, completed: [] }
    fetchMock.mockResolvedValue(Response.json({ player }))
    expect(await session.resetSession()).toEqual(player)
    const [resetUrl, resetInit] = fetchMock.mock.calls[0] as [
      string,
      RequestInit,
    ]
    expect(resetUrl).toBe('/api/me/reset')
    expect(resetInit.method).toBe('POST')
    expect(new Headers(resetInit.headers).get('Authorization')).toBe(
      'Bearer existing-token'
    )
    expect(transport.sessionToken()).toBe('existing-token')
  })
})

describe('persisted query cache', () => {
  const waitForSave = () =>
    vi.waitFor(() => expect(storage.get(query.PERSIST_KEY)).toBeTruthy())
  let query: typeof import('@/shared/api/query')
  beforeEach(async () => {
    query = await import('@/shared/api/query')
    await query.queryCacheRestored
  })

  it('saves the session token through the query persister', async () => {
    transport.saveToken('persisted-token')
    await waitForSave()
    const saved = JSON.parse(storage.get(query.PERSIST_KEY) ?? '{}')
    expect(saved.clientState.queries[0]).toMatchObject({
      queryKey: ['session', 'token'],
      state: { data: 'persisted-token' },
    })
    expect([...storage.keys()]).toEqual([query.PERSIST_KEY])
  })
  it('restores the token after a reload', async () => {
    transport.saveToken('reloaded-token')
    await waitForSave()
    vi.resetModules()
    const reloaded = await import('@/shared/api/query')
    await reloaded.queryCacheRestored
    const next = await import('@/shared/api/transport')
    expect(next.sessionToken()).toBe('reloaded-token')
  })
  it('clears the persisted cache on request', async () => {
    transport.saveToken('doomed-token')
    await waitForSave()
    await query.clearPersistedQueries()
    expect(storage.has(query.PERSIST_KEY)).toBe(false)
    expect(transport.sessionToken()).toBeNull()
  })
})

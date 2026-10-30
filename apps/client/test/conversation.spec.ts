import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { converse } from '../src/core/conversation'
import { game, initialState, update } from '../src/state/game'

const reply = () => ({
  npcId: 'hoa',
  reply: 'Chào bạn!',
  source: 'fallback',
  degraded: true,
  cached: true,
  party: null,
  world: initialState().world,
  quest: null,
  questEvent: null,
  toolCalls: [],
})
beforeEach(() => {
  vi.stubGlobal('localStorage', { getItem: () => 'guest-token' })
  game.setState(() => ({
    ...initialState(),
    guestStatus: 'online',
    dialogue: {
      npc: 'hoa',
      requestId: 'opening',
      history: [],
      thinking: true,
      source: null,
    },
    pending: [{ type: 'talk', npcId: 'hoa' }],
  }))
})
afterEach(() => vi.unstubAllGlobals())

describe('guest NPC turns', () => {
  it('sends greet with bearer auth and replays new optimistic events', async () => {
    let resolve!: (response: Response) => void
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((done) => {
          resolve = done
        })
    )
    vi.stubGlobal('fetch', fetchMock)
    const turn = converse('Hello!', 'greet', true)
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    update({
      pending: [
        { type: 'spend', amount: 5 },
        { type: 'visit', locationId: 'park' },
      ],
    })
    resolve(Response.json(reply()))
    await turn
    const [url, options] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ]
    expect(url).toBe('/api/npc/hoa/interact')
    expect(options.headers).toMatchObject({
      Authorization: 'Bearer guest-token',
    })
    expect(JSON.parse(options.body as string)).toMatchObject({
      intent: 'greet',
      events: [{ type: 'talk', npcId: 'hoa' }],
    })
    expect(JSON.parse(options.body as string)).not.toHaveProperty('playerId')
    expect(game.state.world.currency).toBe(25)
    expect(game.state.world.locationId).toBe('park')
    expect(game.state.pending).toHaveLength(2)
    expect(game.state.dialogue?.thinking).toBe(false)
  })
  it('keeps offline play and restores unsynced events after a storage outage', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 503 }))
    )
    await converse('Hello!', 'greet', true)
    expect(game.state.source).toBe('fallback')
    expect(game.state.dialogue?.thinking).toBe(false)
    expect(game.state.pending).toEqual([{ type: 'talk', npcId: 'hoa' }])
    expect(game.state.lastLine.hoa).toContain('Chào bạn')
  })
})

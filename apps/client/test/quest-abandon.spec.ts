import type { GuestPlayer } from '@saigon/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  beginHttpTurn,
  endHttpTurn,
  resetEventSequence,
} from '@/shared/api/events'
import { abandonQuest, applyQuestSave } from '@/shared/api/quests'
import { saveToken } from '@/shared/api/transport'
import { game, grantQuest, initialState, update } from '@/shared/state/game'
import { questFixture } from './quest-fixture'

const quest = questFixture()
const player = (revision = 2): GuestPlayer => ({
  friendship: {},
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Sóc Nắng',
  color: '#ffeeaa',
  revision,
  world: initialState().world,
  quests: [],
  completed: [],
  reputation: 0,
  unlocks: { owned: [], equipped: {} },
})
beforeEach(() => {
  resetEventSequence()
  game.setState(() => ({
    ...grantQuest(initialState(), quest),
    guestStatus: 'online',
  }))
  saveToken('abandon-token')
})
afterEach(() => {
  endHttpTurn()
  vi.unstubAllGlobals()
})
describe('abandoning generic quests', () => {
  it('removes an offline solo errand and its undelivered parcel', async () => {
    update({
      guestStatus: 'offline',
      world: { ...game.state.world, inventory: { herbs: 1, coffee: 2 } },
    })
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    await abandonQuest(quest.id)
    expect(game.state.quests).toEqual([])
    expect(game.state.trackedQuestId).toBeNull()
    expect(game.state.world.inventory).toEqual({ herbs: 0, coffee: 2 })
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('keeps shared quests while disconnected', async () => {
    update({
      guestStatus: 'offline',
      quests: [
        {
          ...quest,
          scope: 'party',
          party: {
            id: player().id,
            memberIds: [player().id, '22222222-2222-4222-8222-222222222222'],
          },
        },
      ],
    })
    await abandonQuest(quest.id)
    expect(game.state.quests).toHaveLength(1)
    expect(game.state.toast).toContain('Reconnect')
  })
  it('posts an authenticated abandon and applies its authoritative save', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(Response.json({ player: player() }))
    vi.stubGlobal('fetch', fetcher)
    await abandonQuest(quest.id)
    expect(fetcher).toHaveBeenCalledTimes(1)
    const [url, init] = fetcher.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`/api/me/quests/${quest.id}/abandon`)
    expect(init.method).toBe('POST')
    expect(new Headers(init.headers).get('Authorization')).toBe(
      'Bearer abandon-token'
    )
    expect(game.state.quests).toEqual([])
    expect(game.state.serverRevision).toBe(2)
  })
  it.each(['failed', 'malformed'])(
    'retains the quest after a %s response',
    async (kind) => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValue(
            kind === 'failed'
              ? new Response(null, { status: 503 })
              : Response.json({ player: {} })
          )
      )
      await abandonQuest(quest.id)
      expect(game.state.quests[0]?.id).toBe(quest.id)
      expect(game.state.toast).toContain('could not')
    }
  )
  it('ignores an abandon save older than an independent socket update', () => {
    update({ serverRevision: 8 })
    applyQuestSave(player(7))
    expect(game.state.quests[0]?.id).toBe(quest.id)
    expect(game.state.serverRevision).toBe(8)
  })
  it('preserves events and quest progress observed during the request', () => {
    const visiting = questFixture('vy')
    update({
      quests: [visiting],
      trackedQuestId: visiting.id,
      pending: [{ type: 'visit', locationId: 'alley' }],
    })
    applyQuestSave({ ...player(), quests: [visiting] })
    expect(game.state.world.locationId).toBe('alley')
    expect(game.state.quests[0]?.status).toBe('ready')
    expect(game.state.pending).toHaveLength(1)
    expect(game.state.trackedQuestId).toBe(visiting.id)
  })
  it('ignores an old session response after reset', async () => {
    let resolve!: (response: Response) => void
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((done) => {
            resolve = done
          })
      )
    )
    const request = abandonQuest(quest.id)
    await vi.waitFor(() => expect(resolve).toBeTypeOf('function'))
    game.setState(() => ({ ...initialState(), serverRevision: 9 }))
    resolve(Response.json({ player: player(2) }))
    await request
    expect(game.state.serverRevision).toBe(9)
    expect(game.state.world.currency).toBe(30)
  })
  it('does not compete with an active conversation', async () => {
    expect(await beginHttpTurn()).toBe(true)
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    await abandonQuest(quest.id)
    expect(fetcher).not.toHaveBeenCalled()
    expect(game.state.quests).toHaveLength(1)
  })
})

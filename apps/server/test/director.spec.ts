import { describe, expect, it, vi } from 'vitest'
import { CityWorld } from '@/domain/city'
import { CityDirector } from '@/features/director'
import { RoomManager } from '@/features/realtime'
import { GameDb } from '@/shared'
import { live, offline, scripted, setupNpc } from './support/npc'

const ctx = setupNpc()
const config = { ...offline, directorMode: 'scripted' as const }
describe('room city director', () => {
  it('signals relevant NPCs with newly started events', async () => {
    const city = new CityWorld(() => 100000)
    const signalled: { ids: string[]; events: string[] } = {
      ids: [],
      events: [],
    }
    const director = new CityDirector(
      city,
      config,
      ctx.fx.db,
      vi.fn(),
      (snapshot, events) => {
        signalled.events = events.map((event) => event.title)
        signalled.ids = events.flatMap((event) =>
          snapshot.events.some((e) => e.id === event.id) ? [event.id] : []
        )
      }
    )
    await director.tick(100000, 2)
    // The first scripted beat starts "An evening gathering" at City Hall.
    expect(signalled.events).toContain('An evening gathering')
    expect(signalled.ids).toHaveLength(signalled.events.length)
  })

  it('does nothing in empty rooms and runs one scripted beat per ninety seconds', async () => {
    const city = new CityWorld(() => 100000)
    const fetcher = vi.fn()
    const director = new CityDirector(city, config, ctx.fx.db, fetcher)
    await director.tick(100000, 0)
    expect(city.snapshot().revision).toBe(0)
    await director.tick(100000, 2)
    const first = city.snapshot()
    expect(first.events[0]?.kind).toBe('festival')
    expect(first.npcPlacements.vy.anchorId).toBe('gathering')
    expect(first.headlines).toHaveLength(1)
    expect(director.lastSource).toBe('scripted')
    await director.tick(189999, 2)
    expect(city.snapshot().revision).toBe(first.revision)
    await director.tick(190000, 2)
    expect(city.snapshot().weather).toBe('rain')
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('keeps independent room cities and broadcasts the same headline to both members', async () => {
    const manager = new RoomManager(
      { bark: async () => ({ reply: 'Hello' }) },
      () => 100000,
      (city) => new CityDirector(city, config, ctx.fx.db)
    )
    const first = await ctx.fx.guest()
    const second = await ctx.fx.guest()
    const a: unknown[] = [],
      b: unknown[] = []
    const room = manager.connect(first.player, {
      send: (message) => a.push(message),
      close() {},
    })
    manager.connect(second.player, {
      send: (message) => b.push(message),
      close() {},
    })
    const other = manager.createRoom()
    await room.director?.tick(100000, 2)
    expect(
      a.filter(
        (message) => (message as { type: string }).type === 'city-headline'
      )
    ).toEqual(
      b.filter(
        (message) => (message as { type: string }).type === 'city-headline'
      )
    )
    expect(room.city.snapshot().events).toHaveLength(1)
    expect(other.city.snapshot().events).toEqual([])
    manager.shutdown()
  })

  it('falls back after model failure and after the daily director budget is exhausted', async () => {
    const db = new GameDb(
      ctx.fx.sql,
      undefined,
      () => new Date('2098-01-01T12:00:00Z')
    )
    const fetcher = vi.fn(async () => {
      throw new Error('provider_down')
    })
    const director = new CityDirector(
      new CityWorld(),
      { ...live, directorDailyLimit: 1 },
      db,
      fetcher
    )
    await director.tick(100000, 1)
    expect(director.lastSource).toBe('scripted')
    const afterFirst = fetcher.mock.calls.length
    await director.tick(190000, 1)
    expect(director.lastSource).toBe('scripted')
    expect(fetcher.mock.calls.length).toBe(afterFirst)
    const { rows } = await ctx.fx.sql.query<{ directors: number }>(
      'SELECT directors FROM model_spend WHERE day=$1',
      ['2098-01-01']
    )
    expect(rows[0]?.directors).toBe(1)
  })

  it('executes live validated tool actions and records model tokens', async () => {
    const director = new CityDirector(
      new CityWorld(),
      live,
      ctx.fx.db,
      scripted([
        {
          tool: [
            'postHeadline',
            { type: 'post-headline', text: 'A new melody reaches the square.' },
          ],
        },
        { text: 'Neighbors pause to listen.' },
      ])
    )
    await director.tick(100000, 1)
    expect(director.lastSource).toBe('live')
    expect(director.city.snapshot().headlines[0]?.text).toContain('melody')
    expect(director.usage).toMatchObject({
      calls: 2,
      inputTokens: 200,
      outputTokens: 40,
    })
  })

  it('blocks an outstanding model action after the room becomes empty', async () => {
    let release = () => {}
    let started = () => {}
    const requested = new Promise<void>((resolve) => {
      started = resolve
    })
    const pause = new Promise<void>((resolve) => {
      release = resolve
    })
    const replay = scripted([
      { tool: ['setWeather', { type: 'set-weather', weather: 'rain' }] },
      { text: 'Rain is coming.' },
    ])
    const director = new CityDirector(
      new CityWorld(),
      live,
      ctx.fx.db,
      async (url, init) => {
        started()
        await pause
        return replay(url, init)
      }
    )
    const pending = director.tick(100000, 1)
    await requested
    void director.tick(100001, 0)
    release()
    await pending
    expect(director.city.snapshot().revision).toBe(0)
    expect(director.city.snapshot().weather).toBe('clear')
  })

  it('reserves the daily count atomically and resets at UTC midnight', async () => {
    let date = new Date('2098-02-01T23:59:59Z')
    const db = new GameDb(ctx.fx.sql, undefined, () => date)
    expect(
      (
        await Promise.all(
          Array.from({ length: 8 }, () => db.reserveDirector(2))
        )
      ).filter(Boolean)
    ).toHaveLength(2)
    date = new Date('2098-02-02T00:00:00Z')
    expect(await db.reserveDirector(2)).toBe(true)
  })
})

import { describe, expect, it, vi } from 'vitest'
import { CityWorld } from '@/domain/city'
import { CityDirector } from '@/features/director'
import { RoomManager } from '@/features/realtime'
import { GameDb } from '@/shared'
import { live, offline, scripted, setupNpc } from './support/npc'

const ctx = setupNpc()
const config = { ...offline, directorMode: 'scripted' as const }
const DAY = '2098-03-01T08:00:00Z'
const atDay = (offsetMs = 0) => Date.parse(DAY) + offsetMs

describe('room city director', () => {
  it('assigns a concrete activity in the first scripted beat', async () => {
    const city = new CityWorld(() => atDay())
    const director = new CityDirector(city, config, ctx.fx.db, vi.fn())
    await director.tick(atDay(), 2)
    expect(city.snapshot().npcActivities.hoa).toEqual({
      activityId: 'busy',
      startedAt: atDay(),
      endsAt: atDay(180000),
    })
  })

  it('does nothing in empty rooms and drafts one scripted day plan', async () => {
    const city = new CityWorld(() => atDay())
    const fetcher = vi.fn()
    const director = new CityDirector(city, config, ctx.fx.db, fetcher)
    await director.tick(atDay(), 0)
    expect(city.snapshot().revision).toBe(0)
    // The daily plan applies its first beat immediately when players arrive.
    await director.tick(atDay(), 2)
    const first = city.snapshot()
    expect(first.events[0]?.kind).toBe('market-rush')
    expect(first.npcPlacements.mai.locationId).toBe('market')
    expect(first.headlines).toHaveLength(1)
    expect(director.lastSource).toBe('scripted')
    // A later beat (afternoon gathering, +240 min) fires when its time arrives.
    await director.tick(atDay(240 * 60_000), 2)
    expect(
      city.snapshot().events.some((event) => event.kind === 'festival')
    ).toBe(true)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('drafts the day only once per UTC day', async () => {
    const city = new CityWorld(() => atDay())
    const director = new CityDirector(city, config, ctx.fx.db, vi.fn())
    await director.tick(atDay(), 2)
    const afterPlan = city.snapshot().revision
    // A second tick the same day neither re-plans nor re-applies the first beat.
    await director.tick(atDay(60_000), 2)
    expect(city.snapshot().revision).toBe(afterPlan)
  })

  it('keeps independent room cities and broadcasts the same headline to both members', async () => {
    const manager = new RoomManager(
      { bark: async () => ({ reply: 'Hello' }) },
      () => atDay(),
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
    await room.director?.tick(atDay(), 2)
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
      new CityWorld(() => Date.parse('2098-01-01T12:00:00Z')),
      { ...live, directorDailyLimit: 1, directorNewsUrl: undefined },
      db,
      fetcher
    )
    await director.tick(Date.parse('2098-01-01T12:00:00Z'), 1)
    expect(director.lastSource).toBe('scripted')
    const { rows } = await ctx.fx.sql.query<{ directors: number }>(
      'SELECT directors FROM model_spend WHERE day=$1',
      ['2098-01-01']
    )
    expect(rows[0]?.directors).toBe(1)
  })

  it('drafts a live day plan from scheduled tool beats and records model tokens', async () => {
    const director = new CityDirector(
      new CityWorld(() => atDay()),
      { ...live, directorNewsUrl: undefined },
      ctx.fx.db,
      scripted([
        {
          tool: [
            'planBeat',
            {
              atMinutes: 0,
              actions: [
                {
                  type: 'post-headline',
                  text: 'A new melody reaches the square.',
                },
              ],
            },
          ],
        },
        {
          tool: [
            'planBeat',
            {
              atMinutes: 180,
              actions: [{ type: 'set-weather', weather: 'rain' }],
            },
          ],
        },
        { text: 'Neighbors pause to listen.' },
      ])
    )
    await director.tick(atDay(), 1)
    expect(director.lastSource).toBe('live')
    expect(director.city.snapshot().headlines[0]?.text).toContain('melody')
    // The future beat has not fired yet.
    expect(director.city.snapshot().weather).toBe('clear')
    await director.tick(atDay(180 * 60_000), 1)
    expect(director.city.snapshot().weather).toBe('rain')
    expect(director.usage).toMatchObject({
      calls: 3,
      inputTokens: 300,
      outputTokens: 60,
    })
  })

  it('does not apply plan beats after the room becomes empty', async () => {
    let release = () => {}
    let started = () => {}
    const requested = new Promise<void>((resolve) => {
      started = resolve
    })
    const pause = new Promise<void>((resolve) => {
      release = resolve
    })
    const replay = scripted([
      {
        tool: [
          'planBeat',
          {
            atMinutes: 0,
            actions: [{ type: 'set-weather', weather: 'rain' }],
          },
        ],
      },
      { text: 'Rain is coming.' },
    ])
    const director = new CityDirector(
      new CityWorld(() => atDay()),
      { ...live, directorNewsUrl: undefined },
      ctx.fx.db,
      async (url, init) => {
        started()
        await pause
        return replay(url, init)
      }
    )
    const pending = director.tick(atDay(), 1)
    await requested
    void director.tick(atDay(1), 0)
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

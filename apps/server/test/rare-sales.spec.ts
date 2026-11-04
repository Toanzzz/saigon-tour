import {
  CityActionSchema,
  type CityPlanBeat,
  cityFromRoomState,
  syncCity,
  WorldRoomState,
} from '@saigon/shared'
import { describe, expect, it } from 'vitest'
import { CityWorld } from '@/domain/city'
import { scriptedDayPlan } from '@/features/director/scripted'

const action = {
  type: 'start-rare-sale' as const,
  npcId: 'mai' as const,
  unlockId: 'silk-scarf' as const,
}
const day = Date.parse('2098-03-01T08:00:00Z')
describe('Director rare sale rules', () => {
  it('uses authored IDs and fixed catalog prices, expires and synchronizes the offer', () => {
    let now = day
    const city = new CityWorld(() => now)
    expect(city.apply(action).accepted).toBe(true)
    const offer = city.snapshot().rareOffer
    expect(offer).toMatchObject({
      npcId: 'mai',
      unlockId: 'silk-scarf',
      price: 1100,
      startedAt: day,
      endsAt: day + 600_000,
    })
    const room = new WorldRoomState()
    syncCity(room, city.snapshot())
    expect(cityFromRoomState(room).rareOffer).toEqual(offer)
    now += 600_000
    city.expire()
    syncCity(room, city.snapshot())
    expect(cityFromRoomState(room).rareOffer).toBeUndefined()
    expect(CityActionSchema.safeParse({ ...action, price: 1 }).success).toBe(
      false
    )
    expect(
      CityActionSchema.safeParse({ ...action, unlockId: 'non-la' }).success
    ).toBe(false)
  })

  it('enforces one hour spacing, three starts per UTC day, and next-day recovery', () => {
    let now = day
    const city = new CityWorld(() => now)
    expect(city.apply(action).accepted).toBe(true)
    expect(city.apply(action)).toMatchObject({
      accepted: false,
      reason: 'rare_sale_spacing:60_minutes',
    })
    for (let index = 0; index < 2; index++) {
      now += 3_600_000
      expect(city.apply(action).accepted).toBe(true)
    }
    now += 3_600_000
    expect(city.apply(action)).toMatchObject({
      accepted: false,
      reason: 'rare_sale_daily_cap:3',
    })
    now += 86_400_000
    expect(city.apply(action).accepted).toBe(true)
  })

  it('checks the whole schedule without mutation and includes a scripted sale', () => {
    const city = new CityWorld(() => day)
    const beats = (minutes: number[]): CityPlanBeat[] =>
      minutes.map((atMinutes) => ({ atMinutes, actions: [action] }))
    expect(city.validatePlan(beats([10, 70, 130])).accepted).toBe(true)
    expect(city.validatePlan(beats([10, 19]))).toMatchObject({
      accepted: false,
      reason: 'rare_sale_spacing:60_minutes',
    })
    expect(city.validatePlan(beats([10, 70, 130, 190]))).toMatchObject({
      accepted: false,
      reason: 'rare_sale_daily_cap:3',
    })
    expect(city.snapshot().rareOffer).toBeUndefined()
    const scripted = scriptedDayPlan().beats.find((beat) =>
      beat.actions.some((entry) => entry.type === 'start-rare-sale')
    )
    expect(scripted?.atMinutes).toBe(10)
  })

  it('counts existing starts together with proposed sales for the UTC day', () => {
    let now = day
    const city = new CityWorld(() => now)
    city.apply(action)
    now += 3_600_000
    city.apply(action)
    expect(
      city.validatePlan([
        { atMinutes: 60, actions: [action] },
        { atMinutes: 120, actions: [action] },
      ])
    ).toMatchObject({ accepted: false, reason: 'rare_sale_daily_cap:3' })
  })

  it('checks scheduled starts against the current clock without renewing their duration', () => {
    const now = day + 19 * 60_000
    const city = new CityWorld(() => now)
    expect(city.apply(action, now + 1)).toMatchObject({
      accepted: false,
      reason: 'rare_sale_window_inactive',
    })
    expect(city.apply(action, day)).toMatchObject({
      accepted: false,
      reason: 'rare_sale_window_inactive',
    })
    expect(city.apply(action, day + 10 * 60_000).accepted).toBe(true)
    expect(city.snapshot().rareOffer?.endsAt).toBe(day + 20 * 60_000)
    expect(city.apply(action, day + 15 * 60_000)).toMatchObject({
      accepted: false,
      reason: 'rare_sale_spacing:60_minutes',
    })
  })
})

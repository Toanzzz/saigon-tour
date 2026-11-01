import { describe, expect, it } from 'vitest'
import { CityWorld } from '@/domain/city'

const event = {
  type: 'start-event',
  kind: 'festival',
  locationId: 'cityhall',
  title: 'Neighbors gather',
  description: 'A welcoming evening walk.',
  durationMs: 30000,
}
describe('authoritative city actions', () => {
  it('limits events, rejects unknown entities and unsafe strings', () => {
    const city = new CityWorld(() => 100000)
    expect(city.apply(event).accepted).toBe(true)
    expect(city.apply(event).accepted).toBe(true)
    expect(city.apply(event)).toMatchObject({
      accepted: false,
      reason: 'active_event_cap:2',
    })
    for (const action of [
      { ...event, locationId: 'imaginary' },
      { ...event, kind: 'earthquake' },
      { type: 'post-headline', text: 'Visit https://evil.test' },
      { type: 'set-npc-need', npcId: 'hoa', need: '<b>money</b>' },
      { type: 'set-weather', weather: 'snow' },
    ])
      expect(city.apply(action).accepted).toBe(false)
  })

  it('moves only to authored anchors including prototype-key rejection', () => {
    const city = new CityWorld()
    for (const anchorId of [
      'arbitrary',
      '__proto__',
      'constructor',
      'toString',
    ])
      expect(
        city.apply({
          type: 'move-npc',
          npcId: 'mai',
          locationId: 'park',
          anchorId,
        }).accepted
      ).toBe(false)
    expect(
      city.apply({
        type: 'move-npc',
        npcId: 'mai',
        locationId: 'park',
        anchorId: 'gathering',
      }).accepted
    ).toBe(true)
    expect(city.snapshot().npcPlacements.mai).toMatchObject({
      locationId: 'park',
      anchorId: 'gathering',
    })
  })

  it('expires events, clears needs and retains bounded sanitized headlines', () => {
    let now = 100000
    const headlines: string[] = []
    const city = new CityWorld(
      () => now,
      (headline) => headlines.push(headline.text)
    )
    city.apply(event)
    city.apply({
      type: 'set-npc-need',
      npcId: 'hoa',
      need: 'Fresh herbs for Linh',
    })
    city.apply({ type: 'set-npc-need', npcId: 'hoa', need: null })
    expect(city.snapshot().needs.hoa).toBeUndefined()
    for (let index = 0; index < 15; index++)
      city.apply({ type: 'post-headline', text: `  City  note ${index}  ` })
    expect(city.snapshot().headlines).toHaveLength(12)
    expect(headlines[0]).toBe('City note 0')
    now += 30000
    city.expire()
    expect(city.snapshot().events).toEqual([])
    city.dispose()
    expect(city.apply({ type: 'set-weather', weather: 'rain' })).toMatchObject({
      accepted: false,
      reason: 'room_disposed',
    })
  })

  it('does not share mutable snapshot data between rooms or callers', () => {
    const first = new CityWorld()
    const second = new CityWorld()
    first.apply({ type: 'set-weather', weather: 'rain' })
    const view = first.snapshot()
    view.weather = 'clear'
    expect(first.snapshot().weather).toBe('rain')
    expect(second.snapshot().weather).toBe('clear')
    expect(second.snapshot().events).toEqual([])
  })
})

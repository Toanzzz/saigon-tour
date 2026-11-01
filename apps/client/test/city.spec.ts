import {
  type CitySnapshot,
  cityFromRoomState,
  initialCity,
  WorldRoomState,
} from '@saigon/shared'
import { afterEach, describe, expect, it } from 'vitest'
import {
  applyCity,
  city,
  cityHeadline,
  npcPosition,
  resetCity,
} from '@/shared/api/city'

afterEach(resetCity)
describe('room city snapshots', () => {
  it('rejects stale revisions and accepts a fresh room after reset', () => {
    const first = { ...initialCity(), revision: 8, weather: 'rain' as const }
    applyCity(first)
    applyCity({ ...initialCity(), revision: 7 })
    expect(city.state.weather).toBe('rain')
    resetCity()
    applyCity({ ...initialCity(), revision: 1 })
    expect(city.state.revision).toBe(1)
    expect(city.state.weather).toBe('clear')
  })
  it('retains safe authored positions until a complete city snapshot arrives', () => {
    const position = npcPosition('hoa')
    const incomplete = cityFromRoomState(new WorldRoomState())
    applyCity(incomplete)
    expect(npcPosition('hoa')).toEqual(position)
    expect(city.state.npcPlacements).toHaveProperty('thao')
  })
  it('keeps headlines bounded and deduplicates socket repeats', () => {
    for (let index = 0; index < 15; index++)
      cityHeadline({
        id: `headline_${index}`,
        text: `City headline ${index}`,
        createdAt: index,
      })
    cityHeadline({
      id: 'headline_14',
      text: 'The latest city headline',
      createdAt: 14,
    })
    expect(city.state.headlines).toHaveLength(12)
    expect(city.state.headlines.at(-1)?.text).toBe('The latest city headline')
  })
  it('rejects malformed city snapshots before rendering NPC positions', () => {
    applyCity({
      ...initialCity(),
      weather: 'snow',
      npcPlacements: {},
    } as unknown as CitySnapshot)
    expect(() => npcPosition('son')).not.toThrow()
    expect(city.state.weather).toBe('clear')
  })
})

import type { PresencePlayer } from '@saigon/shared'
import { afterEach, describe, expect, it } from 'vitest'
import {
  clearPresence,
  interpolate,
  nearestPlayers,
  presence,
  recordPlayer,
  recordPlayers,
} from '@/shared/api/presence'
import { realtimeUrl } from '@/shared/api/socket'

function player(id: string, x = 0, heading = 0): PresencePlayer {
  return {
    id,
    name: id,
    body: 'man',
    color: '#ffeeaa',
    position: [x, 0, 0],
    heading,
    ride: null,
    look: null,
  }
}
afterEach(clearPresence)
describe('multiplayer transport and interpolation', () => {
  it('removes self recorded before welcome establishes local identity', () => {
    recordPlayers([player('self'), player('other')], '')
    expect(presence.has('self')).toBe(true)
    recordPlayers([player('self'), player('other')], 'self')
    expect(presence.has('self')).toBe(false)
    expect(presence.has('other')).toBe(true)
  })
  it('keeps the API proxy prefix and resolves explicit API origins', () => {
    expect(realtimeUrl('/api', 'http://localhost:58000/')).toBe(
      'http://localhost:58000/api'
    )
    expect(
      realtimeUrl('https://api.example.com/', 'https://game.example.com/')
    ).toBe('https://api.example.com')
    expect(realtimeUrl('/api/', 'https://game.example.com/tour/')).toBe(
      'https://game.example.com/api'
    )
  })
  it('renders 150ms behind and interpolates heading across the shortest turn', () => {
    const samples = [
      { at: 1000, player: player('a', 0, Math.PI - 0.1) },
      { at: 1100, player: player('a', 10, -Math.PI + 0.1) },
    ]
    const value = interpolate(samples, 1200)
    expect(value?.position[0]).toBe(5)
    expect(value?.heading).toBeCloseTo(Math.PI)
    expect(interpolate(samples, 1000)?.position[0]).toBe(0)
    expect(interpolate(samples, 2000)?.position[0]).toBe(10)
    expect(interpolate([], 2000)).toBeNull()
  })
  it('selects only nearest players within 45 units with a mobile cap', () => {
    for (let index = 1; index <= 10; index++)
      recordPlayer(player(`${index}`, index * 5), 1000)
    expect(nearestPlayers([0, 0, 0], 6, 1200).map((value) => value.id)).toEqual(
      ['1', '2', '3', '4', '5', '6']
    )
    expect(nearestPlayers([0, 0, 0], 8, 1200)).toHaveLength(8)
    expect(nearestPlayers([0, 0, 0], 20, 1200)).toHaveLength(9)
  })
})

import {
  type PresencePlayer,
  syncPresence,
  toPresence,
  WorldRoomState,
} from '@saigon/shared'
import { describe, expect, it } from 'vitest'

const player: PresencePlayer = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Linh',
  body: 'woman',
  color: '#abcdef',
  position: [0, 0, 0],
  heading: 0,
  ride: null,
  look: null,
}

describe('presence body', () => {
  it('syncs the body into the schema and reads it back', () => {
    const state = new WorldRoomState()
    syncPresence(state.players, [player])
    const entry = state.players.get(player.id)
    expect(entry).toBeDefined()
    expect(entry?.body).toBe('woman')
    if (entry) expect(toPresence(entry).body).toBe('woman')
  })

  it('falls back to man for an empty presence body', () => {
    const state = new WorldRoomState()
    syncPresence(state.players, [{ ...player, body: 'man' }])
    const entry = state.players.get(player.id)
    expect(entry).toBeDefined()
    if (!entry) return
    entry.body = ''
    expect(toPresence(entry).body).toBe('man')
  })
})

import type { PresencePlayer } from '@saigon/shared'
import { PerspectiveCamera } from 'three'
import { afterEach, describe, expect, it } from 'vitest'
import { clearPresence, recordPlayer } from '@/shared/api/presence'
import {
  clearVisiblePlayers,
  presenceView,
  samplePresenceView,
} from '@/shared/api/presence-view'
import { net, updateNet } from '@/shared/api/status'
import { game, initialState, update } from '@/shared/state/game'

afterEach(() => {
  clearPresence()
  clearVisiblePlayers()
  game.setState(() => initialState())
})

const player = (
  id: string,
  position: PresencePlayer['position'],
  ride: PresencePlayer['ride'] = null
): PresencePlayer => ({
  id,
  name: id,
  body: 'man',
  color: '#fff',
  position,
  heading: 0,
  ride,
  look: null,
})

function camera() {
  const value = new PerspectiveCamera(60, 1, 0.1, 100)
  value.position.set(0, 1, 0)
  value.lookAt(0, 1, -10)
  return value
}

describe('on-screen greeting availability', () => {
  it('follows the camera and closes an open greeting when players leave view', () => {
    update({ position: [0, 0, 0] })
    const view = camera()
    recordPlayer(player('friend', [0, 0, -10]))
    samplePresenceView(8, view)
    expect(presenceView.state.hasVisiblePlayer).toBe(true)
    updateNet({ emotesOpen: true })
    view.lookAt(0, 1, 10)
    samplePresenceView(8, view)
    expect(presenceView.state.hasVisiblePlayer).toBe(false)
    expect(net.state.emotesOpen).toBe(false)
    view.lookAt(0, 1, -10)
    samplePresenceView(8, view)
    expect(presenceView.state.hasVisiblePlayer).toBe(true)
    clearPresence()
    samplePresenceView(8, view)
    expect(presenceView.state.hasVisiblePlayer).toBe(false)
  })

  it('ignores self, loading players, and players outside the viewport', () => {
    update({ position: [0, 0, 0], guestId: 'self' })
    recordPlayer(player('self', [0, 0, -10]))
    recordPlayer(player('loading', [0, 0, -10], 'loading'))
    recordPlayer(player('offscreen', [20, 0, -10]))
    samplePresenceView(8, camera())
    expect(presenceView.state.hasVisiblePlayer).toBe(false)
    recordPlayer(player('friend', [0, 0, -10]))
    samplePresenceView(8, camera())
    expect(presenceView.state.hasVisiblePlayer).toBe(true)
  })

  it('clears visibility and the popover when the scene unmounts', () => {
    presenceView.setState((state) => ({ ...state, hasVisiblePlayer: true }))
    updateNet({ emotesOpen: true })
    clearVisiblePlayers()
    expect(presenceView.state.hasVisiblePlayer).toBe(false)
    expect(net.state.emotesOpen).toBe(false)
  })
})

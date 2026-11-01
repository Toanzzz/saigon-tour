import { initialCity, syncCity, WorldRoomState } from '@saigon/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { applyCity, city, resetCity } from '@/shared/api/city'
import { installRealtime } from '@/shared/api/socket'
import { game, initialState } from '@/shared/state/game'

const mocks = vi.hoisted(() => ({
  rooms: [] as {
    callbacks: Record<string, (...args: unknown[]) => void>
    send: ReturnType<typeof vi.fn>
    leave: ReturnType<typeof vi.fn>
  }[],
}))
vi.mock('@colyseus/sdk', () => ({
  Client: class {
    auth = { token: '' }
    async joinOrCreate() {
      const callbacks: Record<string, (...args: unknown[]) => void> = {}
      const room = { callbacks, send: vi.fn(), leave: vi.fn() }
      mocks.rooms.push(room)
      return {
        ...room,
        onMessage: vi.fn(),
        onStateChange: (callback: (...args: unknown[]) => void) => {
          callbacks.state = callback
        },
        onDrop: (callback: (...args: unknown[]) => void) => {
          callbacks.drop = callback
        },
        onReconnect: (callback: (...args: unknown[]) => void) => {
          callbacks.reconnect = callback
        },
        onLeave: (callback: (...args: unknown[]) => void) => {
          callbacks.leave = callback
        },
      }
    }
  },
}))
let dispose: (() => void) | undefined
afterEach(() => {
  dispose?.()
  dispose = undefined
  resetCity()
  mocks.rooms.length = 0
  game.setState(() => initialState())
  vi.unstubAllGlobals()
})
describe('city room callback ownership', () => {
  it('ignores a replaced room closing after the replacement joined', async () => {
    vi.stubGlobal('location', new URL('http://127.0.0.1:58000/'))
    game.setState(() => ({
      ...initialState(),
      guestId: 'first',
      guestStatus: 'online',
    }))
    dispose = installRealtime()
    await vi.waitFor(() =>
      expect(mocks.rooms[0]?.callbacks.leave).toBeTypeOf('function')
    )
    game.setState((state) => ({ ...state, guestId: 'replacement' }))
    await vi.waitFor(() =>
      expect(mocks.rooms[1]?.callbacks.leave).toBeTypeOf('function')
    )
    applyCity({ ...initialCity(), revision: 9, weather: 'rain' })
    mocks.rooms[0]?.callbacks.leave?.()
    expect(city.state.revision).toBe(9)
    expect(city.state.weather).toBe('rain')
  })
  it('ignores late state patches from a replaced room', async () => {
    vi.stubGlobal('location', new URL('http://127.0.0.1:58000/'))
    game.setState(() => ({
      ...initialState(),
      guestId: 'first',
      guestStatus: 'online',
    }))
    dispose = installRealtime()
    await vi.waitFor(() =>
      expect(mocks.rooms[0]?.callbacks.state).toBeTypeOf('function')
    )
    game.setState((state) => ({ ...state, guestId: 'replacement' }))
    await vi.waitFor(() =>
      expect(mocks.rooms[1]?.callbacks.state).toBeTypeOf('function')
    )
    applyCity({ ...initialCity(), revision: 1, weather: 'clear' })
    const stale = new WorldRoomState()
    stale.street = 'Old room'
    syncCity(stale, { ...initialCity(), revision: 50, weather: 'rain' })
    mocks.rooms[0]?.callbacks.state?.(stale)
    expect(city.state.revision).toBe(1)
    expect(city.state.weather).toBe('clear')
  })
})

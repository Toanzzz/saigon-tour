import {
  applyPlayerEvents,
  type GuestPlayer,
  GuestPlayerSchema,
} from '@saigon/shared'
import { z } from 'zod'
import { motion } from '../core/motion'
import { PLACES } from '../core/places'
import { game, update } from '../state/game'

export const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'
export const GUEST_TOKEN_KEY = 'saigon-tour.guest-token'
export type Guest = GuestPlayer
let token: string | null = null
let initialization: Promise<void> | null = null

function readToken() {
  try {
    return localStorage.getItem(GUEST_TOKEN_KEY)
  } catch {
    return null
  }
}
function saveToken(value: string | null) {
  token = value
  try {
    if (value) localStorage.setItem(GUEST_TOKEN_KEY, value)
    else localStorage.removeItem(GUEST_TOKEN_KEY)
  } catch {
    // Browsers with storage disabled can still play for this session.
  }
}
export function guestToken() {
  return token ?? readToken()
}
export function authorizationHeaders(): Record<string, string> {
  const value = guestToken()
  return value ? { Authorization: `Bearer ${value}` } : {}
}
async function request(path: string, method = 'GET') {
  return fetch(`${API_BASE}${path}`, {
    method,
    headers: authorizationHeaders(),
    signal: AbortSignal.timeout(5000),
  })
}
export function guestState(player: Guest) {
  return {
    guestId: player.id,
    guestName: player.name,
    guestColor: player.color,
    world: player.world,
    quest: player.quest,
    completed: player.completed,
    reputation: player.reputation,
  }
}

export function initializeSession(): Promise<void> {
  if (initialization) return initialization
  const sessionId = game.state.sessionId
  initialization = (async () => {
    update({ guestStatus: 'loading' })
    try {
      token = guestToken()
      let returningGuest = Boolean(token)
      let response = token ? await request('/me') : null
      if (response?.status === 401) {
        saveToken(null)
        returningGuest = false
        response = null
      }
      if (!response) response = await request('/guest', 'POST')
      if (!response.ok) throw new Error('Guest unavailable')
      const body = await response.json()
      const player = GuestPlayerSchema.parse(body.player)
      if (!returningGuest) {
        const value = z.string().min(1).parse(body.token)
        saveToken(value)
      }
      if (game.state.sessionId !== sessionId) return
      game.setState((state) => ({
        ...state,
        ...guestState(player),
        world: applyPlayerEvents(player.world, state.pending),
        guestStatus: 'online',
        returningGuest,
        stop: player.world.locationId,
        position:
          state.screen === 'title'
            ? [
                PLACES[player.world.locationId].at[0],
                0.9,
                PLACES[player.world.locationId].at[2] + 6,
              ]
            : state.position,
      }))
      if (game.state.screen === 'title')
        motion.teleport = [game.state.position[0], game.state.position[2]]
    } catch {
      if (game.state.sessionId === sessionId) update({ guestStatus: 'offline' })
    }
  })().finally(() => {
    initialization = null
  })
  return initialization
}

/** Keep the guest identity; only the saved journey is reset. */
export async function resetSession(): Promise<Guest | null> {
  if (!guestToken()) return null
  const response = await request('/me/reset', 'POST')
  if (!response.ok) throw new Error('Guest reset unavailable')
  return GuestPlayerSchema.parse((await response.json()).player)
}

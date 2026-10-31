import {
  applyPlayerEvents,
  type GuestPlayer,
  GuestPlayerSchema,
} from '@saigon/shared'
import { z } from 'zod'
import { motion } from '@/shared/runtime/motion'
import { game, update } from '@/shared/state/game'
import { PLACES } from '@/shared/world/places'
import { rpc } from './client'
import { guestToken, saveToken } from './transport'

export {
  API_BASE,
  authorizationHeaders,
  GUEST_TOKEN_KEY,
  guestToken,
} from './transport'
export type Guest = GuestPlayer
let initialization: Promise<void> | null = null

export function guestState(player: Guest) {
  return {
    serverRevision: player.revision,
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
      let returningGuest = Boolean(guestToken())
      let response = returningGuest
        ? await rpc.me.$get({}, { init: { signal: AbortSignal.timeout(5000) } })
        : null
      if (response?.status === 401) {
        saveToken(null)
        returningGuest = false
        response = null
      }
      if (!response)
        response = await rpc.guest.$post(
          {},
          { init: { signal: AbortSignal.timeout(5000) } }
        )
      if (!response.ok) throw new Error('Guest unavailable')
      const body = await response.json()
      const player = GuestPlayerSchema.parse(body.player)
      if (!returningGuest) {
        const value = z
          .string()
          .min(1)
          .parse((body as { token?: unknown }).token)
        saveToken(value)
      }
      if (game.state.sessionId !== sessionId) return
      game.setState((state) =>
        player.revision < state.serverRevision
          ? {
              ...state,
              guestStatus: 'online',
              returningGuest,
            }
          : {
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
            }
      )
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
  const response = await rpc.me.reset.$post(
    {},
    { init: { signal: AbortSignal.timeout(5000) } }
  )
  if (!response.ok) throw new Error('Guest reset unavailable')
  return GuestPlayerSchema.parse((await response.json()).player)
}

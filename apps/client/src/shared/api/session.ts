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
import { queryCacheRestored } from './query'
import { apiUrl, saveToken, sessionToken } from './transport'

export {
  API_BASE,
  authorizationHeaders,
  SESSION_TOKEN_QUERY,
  sessionToken,
} from './transport'
export type Guest = GuestPlayer
const timeout = () => AbortSignal.timeout(5000)
const MeSchema = z.object({
  player: GuestPlayerSchema,
  account: z.object({ anonymous: z.boolean() }),
})
const TokenSchema = z.object({ token: z.string().min(1) })
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

/** POST to Better Auth, returning the new session token. */
async function authPost(path: string, body: unknown = {}) {
  const response = await fetch(apiUrl(`/auth${path}`), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(sessionToken() ? { Authorization: `Bearer ${sessionToken()}` } : {}),
    },
    body: JSON.stringify(body),
    signal: timeout(),
  })
  if (!response.ok) throw new Error(`Auth unavailable (${response.status})`)
  return response.json()
}

/** After the Meta redirect, trade the auth cookie for a bearer token. */
async function adoptCookieSession() {
  const response = await fetch(apiUrl('/auth/get-session'), {
    credentials: 'include',
    signal: timeout(),
  })
  if (!response.ok) return false
  const body = (await response.json()) as { session?: unknown } | null
  const parsed = TokenSchema.safeParse(body?.session)
  if (!parsed.success) return false
  saveToken(parsed.data.token)
  return true
}

function takeReturnMarker() {
  if (typeof location === 'undefined') return null
  const url = new URL(location.href)
  const marker = url.searchParams.get('signedIn')
  if (!marker) return null
  url.searchParams.delete('signedIn')
  history.replaceState(history.state, '', url)
  return marker
}

async function loadProviders() {
  try {
    const response = await fetch(apiUrl('/auth/providers'), {
      signal: timeout(),
    })
    const body = z.object({ meta: z.boolean() }).parse(await response.json())
    update({ metaAvailable: body.meta })
  } catch {
    update({ metaAvailable: false })
  }
}

export function initializeSession(): Promise<void> {
  if (initialization) return initialization
  const sessionId = game.state.sessionId
  initialization = (async () => {
    update({ guestStatus: 'loading' })
    void loadProviders()
    try {
      await queryCacheRestored
      const marker = takeReturnMarker()
      if (marker === 'meta') await adoptCookieSession()
      if (marker === 'error') update({ toast: 'Meta sign-in was cancelled.' })
      let returningGuest = Boolean(sessionToken())
      let response = returningGuest
        ? await rpc.me.$get({}, { init: { signal: timeout() } })
        : null
      if (response?.status === 401) {
        saveToken(null)
        returningGuest = false
        response = null
      }
      if (!response) {
        saveToken(TokenSchema.parse(await authPost('/sign-in/anonymous')).token)
        response = await rpc.me.$get({}, { init: { signal: timeout() } })
      }
      if (!response.ok) throw new Error('Guest unavailable')
      const { player, account } = MeSchema.parse(await response.json())
      if (game.state.sessionId !== sessionId) return
      const identity = {
        guestStatus: 'online' as const,
        returningGuest,
        account: account.anonymous ? ('anonymous' as const) : ('meta' as const),
      }
      game.setState((state) =>
        player.revision < state.serverRevision
          ? { ...state, ...identity }
          : {
              ...state,
              ...guestState(player),
              ...identity,
              world: applyPlayerEvents(player.world, state.pending),
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

/** Save a new display name for the current player. */
export async function renamePlayer(name: string): Promise<Guest> {
  const response = await rpc.me.profile.$post(
    { json: { name } },
    { init: { signal: timeout() } }
  )
  if (!response.ok) throw new Error('invalid_name')
  return GuestPlayerSchema.parse((await response.json()).player)
}

/** Start Meta (Facebook) sign-in; the anonymous journey links on return. */
export async function signInWithMeta() {
  const back = new URL(location.href)
  back.search = ''
  back.hash = ''
  const to = (marker: string) => {
    back.searchParams.set('signedIn', marker)
    return back.toString()
  }
  const body = z.object({ url: z.url() }).parse(
    await authPost('/sign-in/social', {
      provider: 'facebook',
      callbackURL: to('meta'),
      errorCallbackURL: to('error'),
    })
  )
  location.assign(body.url)
}

/** End the Meta session; the next load starts a fresh anonymous journey. */
export async function signOut() {
  try {
    await authPost('/sign-out')
  } finally {
    saveToken(null)
  }
}

/** Keep the identity; only the saved journey is reset. */
export async function resetSession(): Promise<Guest | null> {
  if (!sessionToken()) return null
  const response = await rpc.me.reset.$post({}, { init: { signal: timeout() } })
  if (!response.ok) throw new Error('Guest reset unavailable')
  return GuestPlayerSchema.parse((await response.json()).player)
}

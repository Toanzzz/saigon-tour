import { NPCS, type NpcId, type PresencePlayer } from '@saigon/shared'
import { Store } from '@tanstack/store'
import { type Camera, Frustum, Matrix4, Sphere, Vector3 } from 'three'
import { game } from '@/shared/state/game'
import {
  interpolate,
  nearestPlayers,
  npcSpeech,
  presence,
  speech,
} from './presence'
import { net, updateNet } from './status'

export interface RemoteView {
  ride: PresencePlayer['ride']
  moving: boolean
}
export interface PresenceView {
  hasVisiblePlayer: boolean
  /** Nearest remote players, refreshed ~5 Hz. */
  nearest: PresencePlayer[]
  /** Per-player display flags (ride + moving), keyed by player id. */
  remote: Record<string, RemoteView>
  /** Live bubble text by source. */
  bubbles: {
    self: string
    players: Record<string, string>
    npcs: Partial<Record<NpcId, string>>
  }
}

const EMPTY: PresenceView = {
  hasVisiblePlayer: false,
  nearest: [],
  remote: {},
  bubbles: { self: '', players: {}, npcs: {} },
}
export const presenceView = new Store<PresenceView>(EMPTY)
export const resetPresenceView = () => presenceView.setState(() => EMPTY)

const previousPos = new Map<string, PresencePlayer['position']>()

function sameNearest(a: PresencePlayer[], b: PresencePlayer[]) {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) if (a[i].id !== b[i].id) return false
  return true
}
function sameRemote(
  a: Record<string, RemoteView>,
  b: Record<string, RemoteView>
) {
  const keys = Object.keys(b)
  if (keys.length !== Object.keys(a).length) return false
  for (const key of keys) {
    const x = a[key]
    const y = b[key]
    if (!x || x.ride !== y.ride || x.moving !== y.moving) return false
  }
  return true
}
function sameBubbles(a: PresenceView['bubbles'], b: PresenceView['bubbles']) {
  if (a.self !== b.self) return false
  const same = (
    x: Record<string, string | undefined>,
    y: Record<string, string | undefined>
  ) => {
    const keys = new Set([...Object.keys(x), ...Object.keys(y)])
    for (const key of keys) if (x[key] !== y[key]) return false
    return true
  }
  return same(a.players, b.players) && same(a.npcs, b.npcs)
}

const frustum = new Frustum()
const projection = new Matrix4()
const avatarBounds = new Sphere(new Vector3(), 1.5)

export function clearVisiblePlayers() {
  if (presenceView.state.hasVisiblePlayer)
    presenceView.setState((state) => ({ ...state, hasVisiblePlayer: false }))
  if (net.state.emotesOpen) updateNet({ emotesOpen: false })
}

/** Recompute the React-visible presence slice; called ~5 Hz by PresenceTicker. */
export function samplePresenceView(limit: number, camera?: Camera) {
  const now = performance.now()
  const nearest = nearestPlayers(game.state.position, limit, now)
  let hasVisiblePlayer = false
  if (camera) {
    camera.updateMatrixWorld()
    projection.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    )
    frustum.setFromProjectionMatrix(projection)
    hasVisiblePlayer = nearest.some((player) => {
      if (
        player.id === net.state.selfId ||
        player.id === game.state.guestId ||
        player.ride === 'loading'
      )
        return false
      avatarBounds.center.set(
        player.position[0],
        player.position[1] + 0.5,
        player.position[2]
      )
      return frustum.intersectsSphere(avatarBounds)
    })
  }
  if (!hasVisiblePlayer && net.state.emotesOpen)
    updateNet({ emotesOpen: false })
  const nearestIds = new Set(nearest.map((player) => player.id))
  for (const id of previousPos.keys())
    if (!nearestIds.has(id)) previousPos.delete(id)

  const remote: Record<string, RemoteView> = {}
  for (const player of nearest) {
    const sample = interpolate(presence.get(player.id)?.samples ?? [], now)
    if (!sample) continue
    const prev = previousPos.get(player.id) ?? sample.position
    const moved = Math.hypot(
      prev[0] - sample.position[0],
      prev[2] - sample.position[2]
    )
    previousPos.set(player.id, sample.position)
    remote[player.id] = { ride: sample.ride, moving: moved > 0.05 }
  }

  const players: Record<string, string> = {}
  for (const player of nearest) {
    const bubble = speech.get(player.id)
    if (bubble && bubble.until > now) players[player.id] = bubble.text
  }
  const selfBubble = speech.get(game.state.guestId ?? '')
  const self = selfBubble && selfBubble.until > now ? selfBubble.text : ''
  const npcs: Partial<Record<NpcId, string>> = {}
  for (const npc of Object.keys(NPCS) as NpcId[]) {
    const bubble = npcSpeech.get(npc)
    if (bubble && bubble.until > now) npcs[npc] = bubble.text
  }

  const prev = presenceView.state
  const nextNearest = sameNearest(prev.nearest, nearest)
    ? prev.nearest
    : nearest
  const nextRemote = sameRemote(prev.remote, remote) ? prev.remote : remote
  const bubbles = { self, players, npcs }
  const nextBubbles = sameBubbles(prev.bubbles, bubbles)
    ? prev.bubbles
    : bubbles
  if (
    hasVisiblePlayer !== prev.hasVisiblePlayer ||
    nextNearest !== prev.nearest ||
    nextRemote !== prev.remote ||
    nextBubbles !== prev.bubbles
  )
    presenceView.setState(() => ({
      hasVisiblePlayer,
      nearest: nextNearest,
      remote: nextRemote,
      bubbles: nextBubbles,
    }))
}

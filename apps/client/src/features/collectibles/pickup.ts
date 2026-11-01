import { type CoinPickupId, GuestPlayerSchema } from '@saigon/shared'
import { Store } from '@tanstack/store'
import { rpc } from '@/shared/api/client'
import { applyQuestSave } from '@/shared/api/quests'
import { audio } from '@/shared/audio'
import { game, update } from '@/shared/state/game'

/**
 * Coins collected this session. The server `coin_pickups` ledger is the source
 * of truth for the balance; this store only drives the local renderer (hide a
 * collected coin) and stops repeat proximity from re-firing a request.
 */
export const collectedCoins = new Store<ReadonlySet<CoinPickupId>>(
  new Set<CoinPickupId>()
)

/**
 * Coins mid collect-animation, keyed by the frame-clock time (s) the pickup
 * fired. A coin is in `collectedCoins` immediately (so it can never re-grant),
 * but stays here for one short window so the renderer can play its pop/sparkle
 * exit before unmounting. Reduced motion leaves this empty (instant collect).
 */
export const collectingCoins = new Store<ReadonlyMap<CoinPickupId, number>>(
  new Map<CoinPickupId, number>()
)

/** How long (s) the in-world collect effect plays before the coin unmounts. */
export const COLLECT_EFFECT_SECONDS = 0.5

export function isCollected(id: CoinPickupId) {
  return collectedCoins.state.has(id)
}

/** Called by the renderer when a coin's exit animation has finished. */
export function finishCollecting(id: CoinPickupId) {
  if (!collectingCoins.state.has(id)) return
  collectingCoins.setState((map) => {
    const next = new Map(map)
    next.delete(id)
    return next
  })
}

/**
 * Collect a world coin. The server grants currency once per player; the client
 * never mutates currency directly. Offline guests still see the coin vanish
 * with an audio ping, and a later `/me` sync reconciles the wallet. The visual
 * collect effect is cosmetic and runs on this same path for online and offline.
 */
export async function collectCoin(id: CoinPickupId, now: number) {
  if (collectedCoins.state.has(id)) return
  collectedCoins.setState((set) => new Set<CoinPickupId>(set).add(id))
  // Animate the exit unless reduced motion is on (then the coin just vanishes).
  if (!game.state.reducedMotion) {
    collectingCoins.setState((map) => new Map(map).set(id, now))
    // Guarantee cleanup even if the frame loop is throttled (hidden tab, etc.);
    // the renderer also clears this when its animation finishes.
    setTimeout(() => finishCollecting(id), COLLECT_EFFECT_SECONDS * 1000 + 250)
  }
  audio.play('pickup')

  if (game.state.guestStatus !== 'online') return
  const sessionId = game.state.sessionId
  try {
    const response = await rpc.me.pickups[':coinId'].$post(
      { param: { coinId: id } },
      { init: { signal: AbortSignal.timeout(5000) } }
    )
    if (!response.ok) throw new Error('pickup_failed')
    const { player } = await response.json()
    if (game.state.sessionId !== sessionId) return
    applyQuestSave(GuestPlayerSchema.parse(player))
  } catch {
    if (game.state.sessionId === sessionId) update({})
  }
}

/** Clear local collected + in-flight coins, e.g. on a new journey/reset. */
export function resetCollectedCoins() {
  collectedCoins.setState(() => new Set())
  collectingCoins.setState(() => new Map())
}

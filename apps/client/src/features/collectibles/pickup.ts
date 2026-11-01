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

export function isCollected(id: CoinPickupId) {
  return collectedCoins.state.has(id)
}

/**
 * Collect a world coin. The server grants currency once per player; the client
 * never mutates currency directly. Offline guests still see the coin vanish
 * with an audio ping, and a later `/me` sync reconciles the wallet.
 */
export async function collectCoin(id: CoinPickupId) {
  if (collectedCoins.state.has(id)) return
  collectedCoins.setState((set) => new Set<CoinPickupId>(set).add(id))
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

/** Clear local collected coins, e.g. on a new journey/reset. */
export function resetCollectedCoins() {
  collectedCoins.setState(() => new Set())
}

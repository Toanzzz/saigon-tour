import {
  GuestPlayerSchema,
  UNLOCKS,
  type UnlockId,
  type UnlockSlot,
} from '@saigon/shared'
import { m } from '@/shared/i18n'
import { game, notify, update } from '@/shared/state/game'
import { rpc } from './client'
import { applyQuestSave } from './quests'

/**
 * Equip or clear a wardrobe slot. The avatar updates optimistically; the server
 * call reconciles ownership and pushes the new look to the room. Offline guests
 * keep the change locally.
 */
export async function equipUnlock(slot: UnlockSlot, id: UnlockId | null) {
  const state = game.state
  if (id && !state.unlocks.owned.includes(id)) return false
  const previous = state.unlocks.equipped
  const next = { ...previous }
  if (id) next[slot] = id
  else delete next[slot]
  update({ unlocks: { ...state.unlocks, equipped: next } })

  if (state.guestStatus !== 'online') return true
  const sessionId = state.sessionId
  try {
    const response = await rpc.me.equip.$post(
      { json: { slot, id } },
      { init: { signal: AbortSignal.timeout(5000) } }
    )
    if (!response.ok) throw new Error('equip_failed')
    const player = GuestPlayerSchema.parse((await response.json()).player)
    if (game.state.sessionId !== sessionId) return false
    applyQuestSave(player)
    return true
  } catch {
    if (game.state.sessionId === sessionId)
      update({ unlocks: { ...game.state.unlocks, equipped: previous } })
    notify(m.toast_equip_failed())
    return false
  }
}

/** The first owned personal ride, in catalog order, or null if none earned. */
export function ownedVehicle(state = game.state): UnlockId | null {
  for (const def of Object.values(UNLOCKS))
    if (def.slot === 'vehicle' && state.unlocks.owned.includes(def.id))
      return def.id as UnlockId
  return null
}

/** True while a personal ride is mounted (equipped in the vehicle slot). */
export function isMounted(state = game.state): boolean {
  return Boolean(state.unlocks.equipped.vehicle)
}

/**
 * Quick-ride toggle: hop on the earned bike (or hop off) without opening the
 * wardrobe. A no-op when the player has not earned any ride yet. Mounting
 * speeds up walking via `UNLOCKS[vehicle].speed` in the Player loop.
 */
export function toggleVehicle() {
  const mounted = game.state.unlocks.equipped.vehicle
  if (mounted) {
    void equipUnlock('vehicle', null)
    return
  }
  const vehicle = ownedVehicle()
  if (vehicle) void equipUnlock('vehicle', vehicle)
}

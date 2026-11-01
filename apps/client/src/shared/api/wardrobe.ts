import {
  GuestPlayerSchema,
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
  if (id && !state.unlocks.owned.includes(id)) return
  const previous = state.unlocks.equipped
  const next = { ...previous }
  if (id) next[slot] = id
  else delete next[slot]
  update({ unlocks: { ...state.unlocks, equipped: next } })

  if (state.guestStatus !== 'online') return
  const sessionId = state.sessionId
  try {
    const response = await rpc.me.equip.$post(
      { json: { slot, id } },
      { init: { signal: AbortSignal.timeout(5000) } }
    )
    if (!response.ok) throw new Error('equip_failed')
    const player = GuestPlayerSchema.parse((await response.json()).player)
    if (game.state.sessionId !== sessionId) return
    applyQuestSave(player)
  } catch {
    if (game.state.sessionId === sessionId)
      update({ unlocks: { ...game.state.unlocks, equipped: previous } })
    notify(m.toast_equip_failed())
  }
}

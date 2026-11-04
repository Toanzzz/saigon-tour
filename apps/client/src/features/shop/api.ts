import {
  applyQuestEvents,
  consumeGood,
  creditEligible,
  GuestPlayerSchema,
  MARKET_ITEMS,
  type MarketItemId,
  NPC_SHOPS,
  type NpcId,
  type PlayerEvent,
} from '@saigon/shared'
import { Store } from '@tanstack/store'
import { z } from 'zod'
import { restoreStamina } from '@/features/stamina'
import { beginHttpTurn, endHttpTurn } from '@/shared/api/events'
import { applyQuestSave } from '@/shared/api/quests'
import { apiUrl, authorizationHeaders } from '@/shared/api/transport'
import { audio } from '@/shared/audio'
import { m, marketItemLabel } from '@/shared/i18n'
import { game, notify, update } from '@/shared/state/game'
import { commerceError } from './copy'

type Intent =
  | { kind: 'buy'; npcId: NpcId; itemId?: MarketItemId; offerId?: string }
  | { kind: 'use'; itemId: MarketItemId }
type Attempt = {
  intent: Intent
  requestId: string
  events: PlayerEvent[]
  sessionId: string
}
export const commerce = new Store<{ uncertain: boolean }>({ uncertain: false })
let attempt: Attempt | null = null
const ReceiptSchema = z.object({
  player: GuestPlayerSchema,
  receipt: z.object({ requestId: z.uuid(), restore: z.number() }),
})
export function resetCommerce() {
  attempt = null
  commerce.setState(() => ({ uncertain: false }))
}

function offline(intent: Intent) {
  const state = game.state
  const requestId = crypto.randomUUID()
  if (intent.kind === 'use') {
    const result = consumeGood(state.world, state.quests, intent.itemId)
    if ('error' in result) {
      notify(commerceError(result.error))
      return false
    }
    update({ world: result.world })
    restoreStamina(requestId, result.restore, result.world.effects)
    audio.play('pickup')
    return true
  }
  const itemId = intent.itemId
  if (!itemId || !NPC_SHOPS[intent.npcId].includes(itemId)) {
    notify(m.shop_connect_rare())
    return false
  }
  const item = MARKET_ITEMS[itemId]
  const credit =
    state.world.currency < item.price && creditEligible(state.quests, itemId)
  if (
    (state.world.currency < item.price && !credit) ||
    (state.world.inventory[itemId] ?? 0) >= 100
  ) {
    notify(m.shop_not_enough_coins())
    return false
  }
  update({
    ...applyQuestEvents(state.world, state.quests, [
      { type: 'purchase', itemId, ...(credit ? { credit: true } : {}) },
    ]),
  })
  audio.play('pickup')
  notify(m.toast_added_to_bag({ item: marketItemLabel(itemId) }))
  return true
}

/** Uncertain requests keep their original id/events and must be reconciled first. */
export async function transact(intent: Intent): Promise<boolean> {
  if (attempt && JSON.stringify(attempt.intent) !== JSON.stringify(intent)) {
    notify(m.shop_retry_needed())
    return false
  }
  if (!attempt && game.state.guestStatus === 'offline') return offline(intent)
  if (!attempt && game.state.pending.length > 16) {
    notify(m.toast_finish_conversation())
    return false
  }
  if (!(await beginHttpTurn())) {
    notify(m.toast_finish_conversation())
    return false
  }
  let definitive = false
  try {
    if (!attempt) {
      attempt = {
        intent,
        requestId: crypto.randomUUID(),
        events: game.state.pending.slice(0, 16),
        sessionId: game.state.sessionId,
      }
      update({ pending: game.state.pending.slice(attempt.events.length) })
    }
    const current = attempt
    const { kind, ...fields } = current.intent
    const response = await fetch(
      apiUrl(kind === 'buy' ? '/me/shop/buy' : '/me/items/use'),
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          ...authorizationHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...fields,
          requestId: current.requestId,
          events: current.events,
        }),
        signal: AbortSignal.timeout(8000),
      }
    )
    if (current.sessionId !== game.state.sessionId) return false
    if (!response.ok) {
      const failure = z
        .object({ error: z.string() })
        .parse(await response.json())
      if (response.status >= 500) throw new Error(failure.error)
      definitive = true
      update({ pending: [...current.events, ...game.state.pending] })
      notify(commerceError(failure.error))
      return false
    }
    const result = ReceiptSchema.parse(await response.json())
    if (result.receipt.requestId !== current.requestId)
      throw new Error('receipt_mismatch')
    definitive = true
    applyQuestSave(result.player)
    if (current.intent.kind === 'use')
      restoreStamina(
        result.receipt.requestId,
        result.receipt.restore,
        result.player.world.effects
      )
    audio.play('pickup')
    notify(
      current.intent.kind === 'use'
        ? m.shop_used({ item: marketItemLabel(current.intent.itemId) })
        : current.intent.itemId
          ? m.toast_added_to_bag({
              item: marketItemLabel(current.intent.itemId),
            })
          : m.shop_purchased()
    )
    return true
  } catch {
    notify(m.shop_retry_needed())
    return false
  } finally {
    if (definitive || attempt?.sessionId !== game.state.sessionId) {
      attempt = null
      commerce.setState(() => ({ uncertain: false }))
    } else commerce.setState(() => ({ uncertain: true }))
    endHttpTurn()
  }
}

export const retryCommerce = () =>
  attempt ? transact(attempt.intent) : Promise.resolve(false)

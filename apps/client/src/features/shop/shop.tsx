import {
  creditEligible,
  MARKET_ITEMS,
  type MarketItemId,
  NPC_SHOPS,
  type NpcId,
  UNLOCKS,
  type UnlockId,
  type UnlockSlot,
} from '@saigon/shared'
import { useMutation } from '@tanstack/react-query'
import { useSelector } from '@tanstack/react-store'
import { useEffect } from 'react'
import { city } from '@/shared/api/city'
import { equipUnlock } from '@/shared/api/wardrobe'
import { m, marketItemLabel, unlockLabel } from '@/shared/i18n'
import type { GameState } from '@/shared/state/game'
import { clock, startClock, stopClock } from '@/shared/state/ui'
import { GoodIcon } from '@/shared/ui/good-icon'
import { WardrobeThumbnail } from '@/shared/ui/wardrobe-thumbnail'
import { commerce, transact } from './api'
import { goodEffect } from './copy'
import { CommerceRetry } from './retry'

export function NpcShop({ npc, state }: { npc: NpcId; state: GameState }) {
  const sale = useSelector(city, (value) => value.rareOffer)
  const now = useSelector(clock, (value) => value.now)
  const uncertain = useSelector(commerce, (value) => value.uncertain)
  const buy = useMutation({ mutationFn: transact })
  const equip = useMutation({
    mutationFn: ({ slot, id }: { slot: UnlockSlot; id: UnlockId }) =>
      equipUnlock(slot, id),
  })
  useEffect(() => {
    startClock()
    return stopClock
  }, [])
  const offer = sale?.npcId === npc ? sale : undefined
  const active = offer && offer.endsAt > now
  const owned = offer && state.unlocks.owned.includes(offer.unlockId)
  return (
    <section className="npc-shop" aria-label={m.shop_title()}>
      <CommerceRetry />
      <div className="fare-row">
        <span>{m.wallet()}</span>
        <strong>{m.coins({ count: state.world.currency })}</strong>
      </div>
      {NPC_SHOPS[npc].map((id: MarketItemId) => {
        const item = MARKET_ITEMS[id]
        const credit =
          state.world.currency < item.price && creditEligible(state.quests, id)
        return (
          <div className="good-row" key={id}>
            <GoodIcon id={id} />
            <div>
              <strong>{marketItemLabel(id)}</strong>
              <small>{goodEffect(id)}</small>
              <small>
                {m.shop_in_bag({ count: state.world.inventory[id] ?? 0 })}
              </small>
              {credit && (
                <small>
                  {m.market_on_credit({ item: marketItemLabel(id) })}
                </small>
              )}
            </div>
            <button
              type="button"
              disabled={
                buy.isPending ||
                uncertain ||
                (state.world.inventory[id] ?? 0) >= 100 ||
                (state.world.currency < item.price && !credit)
              }
              onClick={() =>
                buy.mutate({ kind: 'buy', npcId: npc, itemId: id })
              }
              aria-label={m.shop_buy_item({ item: marketItemLabel(id) })}
            >
              {m.coins({ count: item.price })}
            </button>
          </div>
        )
      })}
      {offer && (
        <div className={`rare-offer${active ? '' : ' is-expired'}`}>
          <span className="rare-badge">{m.shop_rare()}</span>
          <WardrobeThumbnail body={state.body} id={offer.unlockId} />
          <strong>{unlockLabel(offer.unlockId)}</strong>
          <p>
            {active
              ? m.shop_remaining({
                  minutes: Math.ceil((offer.endsAt - now) / 60000),
                })
              : m.shop_expired()}
          </p>
          {owned ? (
            <span>{m.shop_owned()}</span>
          ) : (
            <button
              type="button"
              className="primary-button"
              disabled={
                !active ||
                buy.isPending ||
                uncertain ||
                state.guestStatus !== 'online' ||
                state.world.currency < offer.price
              }
              onClick={() =>
                buy.mutate({ kind: 'buy', npcId: npc, offerId: offer.id })
              }
            >
              {m.shop_buy_item({ item: unlockLabel(offer.unlockId) })} ·{' '}
              {m.coins({ count: offer.price })}
            </button>
          )}
          {owned && (
            <button
              type="button"
              disabled={equip.isPending}
              onClick={() => {
                equip.mutate({
                  slot: UNLOCKS[offer.unlockId].slot,
                  id: offer.unlockId,
                })
              }}
            >
              {m.wardrobe_equip()}
            </button>
          )}
        </div>
      )}
      {!NPC_SHOPS[npc].length && !active && <p>{m.shop_empty()}</p>}
    </section>
  )
}

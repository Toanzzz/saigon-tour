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
import { Icon } from '@/shared/ui/icons'
import { commerce, transact } from './api'
import { goodEffect } from './copy'
import { ShopItemArt } from './item-art'
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
      <header className="shop-wallet">
        <div>
          <span className="shop-eyebrow">{m.shop_stock_heading()}</span>
          <p>{m.shop_intro()}</p>
        </div>
        <span className="shop-wallet-value">
          <Icon name="coin" size={18} />
          <strong>{m.coins({ count: state.world.currency })}</strong>
        </span>
      </header>
      {NPC_SHOPS[npc].map((id: MarketItemId) => {
        const item = MARKET_ITEMS[id]
        const credit =
          state.world.currency < item.price && creditEligible(state.quests, id)
        return (
          <article className="good-row shop-good" key={id}>
            <div className="shop-product-row">
              <ShopItemArt id={id} label={marketItemLabel(id)} />
              <div className="shop-product-copy">
                <h3>{marketItemLabel(id)}</h3>
                <p className="shop-effect">{goodEffect(id)}</p>
                {credit && (
                  <p className="shop-credit">
                    {m.market_on_credit({ item: marketItemLabel(id) })}
                  </p>
                )}
              </div>
            </div>
            <footer className="shop-card-footer">
              <span className="shop-bag-count">
                {m.shop_in_bag({ count: state.world.inventory[id] ?? 0 })}
              </span>
              <button
                type="button"
                className="primary-button shop-buy"
                aria-busy={buy.isPending}
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
                <span>{m.shop_buy()}</span>
                <span className="shop-price">
                  <Icon name="coin" size={17} />
                  {m.coins({ count: item.price })}
                </span>
              </button>
            </footer>
          </article>
        )
      })}
      {offer && (
        <article
          className={`rare-offer shop-good${active ? '' : ' is-expired'}`}
        >
          <header className="rare-offer-heading">
            <span className="rare-badge">
              <Icon name="star" size={14} />
              {m.shop_rare()}
            </span>
            <span className="shop-sale-time">
              {active
                ? m.shop_remaining({
                    minutes: Math.ceil((offer.endsAt - now) / 60000),
                  })
                : m.shop_expired()}
            </span>
          </header>
          <div className="shop-product-row">
            <ShopItemArt
              id={offer.unlockId}
              label={unlockLabel(offer.unlockId)}
            />
            <div className="shop-product-copy">
              <h3>{unlockLabel(offer.unlockId)}</h3>
              <p className="shop-effect">{m.shop_rare_intro()}</p>
              <span className="shop-rare-price">
                <Icon name="coin" size={16} />
                {m.coins({ count: offer.price })}
              </span>
            </div>
          </div>
          <footer className="shop-card-footer">
            {owned ? (
              <span className="shop-owned">
                <Icon name="check" size={17} />
                {m.shop_owned()}
              </span>
            ) : (
              <>
                <span className="shop-card-note">
                  {!active
                    ? m.shop_expired()
                    : state.guestStatus !== 'online'
                      ? m.shop_connect_rare()
                      : state.world.currency < offer.price
                        ? m.shop_not_enough_coins()
                        : m.shop_rare()}
                </span>
                <button
                  type="button"
                  className="primary-button shop-buy"
                  aria-label={m.shop_buy_item({
                    item: unlockLabel(offer.unlockId),
                  })}
                  aria-busy={buy.isPending}
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
                  {m.shop_buy()}
                </button>
              </>
            )}
            {owned && (
              <button
                type="button"
                className="primary-button shop-buy"
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
          </footer>
        </article>
      )}
      {!NPC_SHOPS[npc].length && !active && <p>{m.shop_empty()}</p>}
    </section>
  )
}

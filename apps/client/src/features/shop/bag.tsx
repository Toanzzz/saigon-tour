import {
  MARKET_ITEMS,
  type MarketItemId,
  reservedQuantity,
} from '@saigon/shared'
import { useMutation } from '@tanstack/react-query'
import { useSelector } from '@tanstack/react-store'
import { m, marketItemLabel } from '@/shared/i18n'
import type { GameState } from '@/shared/state/game'
import { Icon } from '@/shared/ui/icons'
import { commerce, transact } from './api'
import { goodEffect } from './copy'
import { ShopItemArt } from './item-art'
import { CommerceRetry } from './retry'

export function ConsumableBag({ state }: { state: GameState }) {
  const use = useMutation({
    mutationFn: (itemId: MarketItemId) => transact({ kind: 'use', itemId }),
  })
  const uncertain = useSelector(commerce, (value) => value.uncertain)
  return (
    <div className="consumable-bag">
      <CommerceRetry />
      {(Object.keys(MARKET_ITEMS) as MarketItemId[]).map((id) => {
        const count = state.world.inventory[id] ?? 0
        if (!count) return null
        const reserved = reservedQuantity(state.quests, id)
        return (
          <div key={id} className="good-row bag-good">
            <ShopItemArt id={id} label={marketItemLabel(id)} />
            <div className="shop-product-copy">
              <h3>
                {marketItemLabel(id)} ×{count}
              </h3>
              <p className="shop-effect">{goodEffect(id)}</p>
              {reserved > 0 && (
                <small className="shop-reserved">
                  <Icon name="lock" size={13} />
                  {m.shop_reserved_count({ count: Math.min(count, reserved) })}
                </small>
              )}
            </div>
            <button
              type="button"
              className="primary-button shop-use"
              aria-busy={use.isPending}
              disabled={use.isPending || uncertain || count <= reserved}
              onClick={() => use.mutate(id)}
              aria-label={m.shop_use_item({ item: marketItemLabel(id) })}
            >
              {m.shop_use()}
            </button>
          </div>
        )
      })}
    </div>
  )
}

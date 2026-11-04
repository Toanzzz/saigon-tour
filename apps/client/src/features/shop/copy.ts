import type { MarketItemId } from '@saigon/shared'
import { m } from '@/shared/i18n'

export function goodEffect(id: MarketItemId) {
  const messages = {
    coffee: m.shop_effect_coffee,
    banana: m.shop_effect_banana,
    baguette: m.shop_effect_baguette,
    pho: m.shop_effect_pho,
  }
  return messages[id]()
}

export function commerceError(error: string) {
  if (error === 'insufficient_funds') return m.shop_not_enough_coins()
  if (error === 'quest_reserved' || error === 'item_reserved')
    return m.shop_reserved()
  if (error === 'too_far' || error === 'too_far_from_shop')
    return m.shop_too_far()
  if (error === 'offer_expired' || error === 'offer_not_found')
    return m.shop_expired()
  if (error === 'already_owned') return m.shop_owned()
  return m.shop_failed()
}

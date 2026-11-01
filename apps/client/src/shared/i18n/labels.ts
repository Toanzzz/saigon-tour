import type { ItemId } from '@saigon/shared'
import { m } from '@/paraglide/messages'
import { getLocale } from '@/paraglide/runtime'

/** Localized carried-item name; call at render time. */
export function itemLabel(itemId: ItemId): string {
  const labels: Record<ItemId, () => string> = {
    herbs: m.item_herbs,
    postcard: m.item_postcard,
    photo: m.item_photo,
    noodles: m.item_noodles,
    broth: m.item_broth,
    baguette: m.item_baguette,
    coffee: m.item_coffee,
    banana: m.item_banana,
  }
  return labels[itemId]()
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat(getLocale()).format(value)
}

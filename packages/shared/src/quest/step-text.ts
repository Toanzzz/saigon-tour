import type { ItemId } from '../entities'
import { merchantFor } from '../goods'
import type { Locale } from '../locale'
import { marketItemName, npcName, placeLabel } from '../localized-names'
import { NPCS } from '../npcs/derive'
import type { QuestStep } from './schema'

type Text = Record<Locale, string>

/** Concrete item names for both locales; used by server fallbacks and riddles. */
const ITEM_NAMES: Record<ItemId, Text> = {
  herbs: { en: 'fresh herbs', vi: 'rau thơm' },
  postcard: { en: 'postcard', vi: 'bưu thiếp' },
  photo: { en: 'group photo', vi: 'tấm ảnh chung' },
  noodles: { en: 'noodles', vi: 'bánh phở' },
  broth: { en: 'broth', vi: 'nước lèo' },
  baguette: { en: 'sandwich', vi: 'bánh mì' },
  coffee: { en: 'iced milk coffee', vi: 'cà phê sữa đá' },
  banana: { en: 'ripe banana', vi: 'chuối chín' },
  pho: { en: 'bowl of phở', vi: 'tô phở' },
  cake: { en: 'wedding cake', vi: 'bánh cưới' },
  'coffee-beans': { en: 'coffee beans', vi: 'hạt cà phê' },
  'sheet-music': { en: 'sheet music', vi: 'bản nhạc' },
  lanterns: { en: 'paper lanterns', vi: 'đèn lồng giấy' },
}

export function itemName(id: ItemId, locale: Locale = 'en') {
  return ITEM_NAMES[id][locale]
}

/**
 * Concrete, locale-aware sentence naming a quest step and where it happens.
 * Shared so the server's incomplete fallback and the riddle reveal line read
 * the same way. People steps name both the neighbor and their home place.
 */
export function stepText(step: QuestStep, locale: Locale = 'en'): string {
  const at = (npcId: Parameters<typeof npcName>[0]) =>
    placeLabel(NPCS[npcId].location, locale)
  if (locale === 'vi') {
    switch (step.type) {
      case 'GO_TO':
        return `đến ${placeLabel(step.locationId, 'vi')}`
      case 'TALK_TO':
        return `gặp ${npcName(step.npcId, 'vi')} ở ${at(step.npcId)}`
      case 'DELIVER':
        return `đưa ${itemName(step.itemId, 'vi')} cho ${npcName(step.npcId, 'vi')} ở ${at(step.npcId)}`
      case 'BUY':
        return `mua ${marketItemName(step.marketItemId, 'vi')} từ ${npcName(merchantFor(step.marketItemId), 'vi')}`
      case 'BRING':
        return `mang ${itemName(step.itemId, 'vi')} cho ${npcName(step.npcId, 'vi')} ở ${at(step.npcId)}`
    }
  }
  switch (step.type) {
    case 'GO_TO':
      return `visit ${placeLabel(step.locationId, 'en')}`
    case 'TALK_TO':
      return `talk to ${npcName(step.npcId, 'en')} at ${at(step.npcId)}`
    case 'DELIVER':
      return `give ${itemName(step.itemId, 'en')} to ${npcName(step.npcId, 'en')} at ${at(step.npcId)}`
    case 'BUY':
      return `buy ${marketItemName(step.marketItemId, 'en')} from ${npcName(merchantFor(step.marketItemId), 'en')}`
    case 'BRING':
      return `bring ${itemName(step.itemId, 'en')} to ${npcName(step.npcId, 'en')} at ${at(step.npcId)}`
  }
}

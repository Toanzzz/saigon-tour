import type { LocationId, MarketItemId, NpcId } from './entities'
import type { Locale } from './locale'
import { NPC_NAMES } from './npcs/derive'

type Text = Record<Locale, string>

export { NPC_NAMES }

export const PLACE_NAMES: Record<LocationId, Text> = {
  market: { en: 'Ben Thanh Market', vi: 'Chợ Bến Thành' },
  park: { en: 'Neighborhood park', vi: 'Công viên khu phố' },
  cityhall: { en: 'City Hall', vi: 'Tòa Thị Chính' },
  cathedral: { en: 'Notre-Dame Cathedral', vi: 'Nhà thờ Đức Bà' },
  river: { en: 'Saigon riverside', vi: 'Bến sông Sài Gòn' },
  opera: { en: 'Saigon Opera House', vi: 'Nhà hát Thành phố' },
  postoffice: { en: 'Central Post Office', vi: 'Bưu điện Trung tâm' },
  alley: { en: 'Bui Vien food alley', vi: 'Hẻm ẩm thực Bùi Viện' },
}

export const MARKET_ITEM_NAMES: Record<MarketItemId, Text> = {
  coffee: { en: 'iced milk coffee', vi: 'cà phê sữa' },
  banana: { en: 'ripe banana', vi: 'chuối chín' },
  baguette: { en: 'bánh mì', vi: 'bánh mì' },
  pho: { en: 'bowl of phở', vi: 'tô phở' },
}

export function npcName(id: NpcId, locale: Locale = 'en') {
  return NPC_NAMES[id][locale]
}

export function placeLabel(id: LocationId, locale: Locale = 'en') {
  return PLACE_NAMES[id][locale]
}

export function marketItemName(id: MarketItemId, locale: Locale = 'en') {
  return MARKET_ITEM_NAMES[id][locale]
}

export function hasVietnameseText(text: string) {
  return /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i.test(
    text
  )
}

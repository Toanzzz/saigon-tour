import type { LocationId, MarketItemId, NpcId } from './entities'
import type { Locale } from './locale'

type Text = Record<Locale, string>
export const NPC_NAMES: Record<NpcId, Text> = {
  hoa: { en: 'Ms. Hoa', vi: 'Cô Hoa' },
  tam: { en: 'Tam', vi: 'Anh Tâm' },
  linh: { en: 'Linh', vi: 'Chị Linh' },
  ba: { en: 'Mr. Ba', vi: 'Ông Ba' },
  mai: { en: 'Mai', vi: 'Mai' },
  alex: { en: 'Alex', vi: 'Alex' },
  vy: { en: 'Vy', vi: 'Vy' },
  son: { en: 'Son', vi: 'Sơn' },
  thao: { en: 'Thao', vi: 'Thảo' },
  'bread-vendor': { en: 'Mr. Binh', vi: 'Chú Bình' },
  'fruit-vendor': { en: 'Ms. Hanh', vi: 'Cô Hạnh' },
  'market-browse': { en: 'Ngoc', vi: 'Ngọc' },
  'market-walk': { en: 'Dat', vi: 'Đạt' },
  'market-family': { en: 'Huong', vi: 'Chị Hương' },
  'coffee-friend': { en: 'Duc', vi: 'Anh Đức' },
  'coffee-reader': { en: 'Quynh', vi: 'Quỳnh' },
  commuter: { en: 'Tuan', vi: 'Tuấn' },
  student: { en: 'Minh', vi: 'Minh' },
  'park-reader': { en: 'Mr. Phuc', vi: 'Chú Phúc' },
  'park-stretch': { en: 'Yen', vi: 'Yến' },
  'plaza-friends': { en: 'Ha', vi: 'Hà' },
  'plaza-stroll': { en: 'Khai', vi: 'Khải' },
  'opera-visitor': { en: 'Diem', vi: 'Diễm' },
  'postcard-reader': { en: 'Bao', vi: 'Bảo' },
  'square-tourist': { en: 'An', vi: 'An' },
  'riverside-friends': { en: 'Nhi', vi: 'Nhi' },
  'river-jogger': { en: 'Long', vi: 'Long' },
  'alley-vendor': { en: 'Mr. Loc', vi: 'Chú Lộc' },
  'alley-diner': { en: 'Trang', vi: 'Trang' },
}

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

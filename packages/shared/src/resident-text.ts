import type { NpcId } from './entities'
import type { Locale } from './locale'

type ResidentId = Exclude<
  NpcId,
  'hoa' | 'tam' | 'linh' | 'ba' | 'mai' | 'alex' | 'vy' | 'son' | 'thao'
>
type ResidentText = Record<
  Locale,
  { role: string; knowledge: string[]; idleLine: string }
>
const resident = (
  enRole: string,
  viRole: string,
  enPlace: string,
  viPlace: string
): ResidentText => ({
  en: {
    role: enRole,
    knowledge: [
      `I spend my days around ${enPlace}.`,
      'A small favor helps neighbors get to know one another.',
    ],
    idleLine: `Hello! I'm the ${enRole.toLowerCase()}. How is your walk today?`,
  },
  vi: {
    role: viRole,
    knowledge: [
      `Mình hay ở quanh ${viPlace}.`,
      'Một việc nhỏ cũng giúp hàng xóm gần nhau hơn.',
    ],
    idleLine: `Chào bạn! Mình là ${viRole.toLowerCase()}. Hôm nay bạn đi dạo thế nào?`,
  },
})

export const RESIDENT_TEXT: Record<ResidentId, ResidentText> = {
  'bread-vendor': resident(
    'Sandwich vendor',
    'Người bán bánh mì',
    'the market',
    'chợ'
  ),
  'fruit-vendor': resident(
    'Fruit vendor',
    'Người bán trái cây',
    'the market',
    'chợ'
  ),
  'market-browse': resident(
    'Market regular',
    'Khách quen ở chợ',
    'the market',
    'chợ'
  ),
  'market-walk': resident(
    'Market courier',
    'Người giao hàng ở chợ',
    'the market',
    'chợ'
  ),
  'market-family': resident(
    'Family shopper',
    'Người đi chợ cùng gia đình',
    'the market',
    'chợ'
  ),
  'coffee-friend': resident(
    'Coffee regular',
    'Khách quen quán cà phê',
    'the market',
    'chợ'
  ),
  'coffee-reader': resident(
    'Café reader',
    'Người đọc sách ở quán cà phê',
    'the market',
    'chợ'
  ),
  commuter: resident('Commuter', 'Người đi làm', 'the market', 'chợ'),
  student: resident('Student', 'Sinh viên', 'the park', 'công viên'),
  'park-reader': resident(
    'Park reader',
    'Người đọc sách ở công viên',
    'the park',
    'công viên'
  ),
  'park-stretch': resident(
    'Morning exerciser',
    'Người tập thể dục buổi sáng',
    'the park',
    'công viên'
  ),
  'plaza-friends': resident(
    'Plaza neighbor',
    'Hàng xóm ở quảng trường',
    'City Hall',
    'Tòa Thị Chính'
  ),
  'plaza-stroll': resident(
    'Evening stroller',
    'Người dạo phố buổi tối',
    'City Hall',
    'Tòa Thị Chính'
  ),
  'opera-visitor': resident(
    'Opera visitor',
    'Khách tham quan Nhà hát',
    'the Opera House',
    'Nhà hát Thành phố'
  ),
  'postcard-reader': resident(
    'Postcard reader',
    'Người đọc bưu thiếp',
    'the Central Post Office',
    'Bưu điện Trung tâm'
  ),
  'square-tourist': resident(
    'Square visitor',
    'Khách tham quan quảng trường',
    'the cathedral square',
    'quảng trường nhà thờ'
  ),
  'riverside-friends': resident(
    'River neighbor',
    'Hàng xóm bên sông',
    'the riverside',
    'bờ sông'
  ),
  'river-jogger': resident(
    'Riverside runner',
    'Người chạy bộ bên sông',
    'the riverside',
    'bờ sông'
  ),
  'alley-vendor': resident(
    'Alley cook',
    'Người nấu ăn trong hẻm',
    'the food alley',
    'hẻm ẩm thực'
  ),
  'alley-diner': resident(
    'Food enthusiast',
    'Người mê ẩm thực',
    'the food alley',
    'hẻm ẩm thực'
  ),
}

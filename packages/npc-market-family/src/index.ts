import { defineResident, type NpcLook } from '@saigon/npc-kit'
import { activities } from './activities'

const look: NpcLook = {
  body: 'own',
  color: '#baddc1',
  portraitBg: 'var(--avatar-color)',
  animation: 'emote-yes',
  avatar: true,
}

export default defineResident({
  activities,
  id: 'market-family',
  completion: {
    en: 'Thank you! There is always something to juggle on market day. You made mine a little lighter.',
    vi: 'Chị cảm ơn bạn nha! Đi chợ lúc nào cũng tay xách nách mang. Có bạn giúp, hôm nay nhẹ hẳn.',
  },
  helloPayoff: {
    en: 'You said hello to Linh for me! Thank you. Between the bags and the shopping list, I would never have made that visit today.',
    vi: 'Bạn chào chị Linh giùm chị rồi! Cảm ơn nha. Nào túi nào giỏ nào danh sách, hôm nay không có bạn là chị chẳng ghé được.',
  },
  name: { en: 'Huong', vi: 'Chị Hương' },
  roles: { en: 'Family shopper', vi: 'Người đi chợ cùng gia đình' },
  place: { en: 'the market', vi: 'chợ' },
  home: 'market',
  at: [-35, 3],
  look,
})

import { defineResident, type NpcLook } from '@saigon/npc-kit'
import { activities } from './activities'

const look: NpcLook = {
  body: 'own',
  color: '#baddc1',
  portraitBg: 'var(--avatar-color)',
  animation: 'sit',
  avatar: true,
}

export default defineResident({
  activities,
  id: 'coffee-reader',
  completion: {
    en: 'Thank you. A small kindness can stay with you longer than a whole chapter. I will save you a quiet seat.',
    vi: 'Cảm ơn bạn nha. Một chuyện tử tế nhỏ đôi khi ở lại lâu hơn cả một chương sách. Mình giữ cho bạn một chỗ yên tĩnh nhé.',
  },
  helloPayoff: {
    en: 'My hello reached Linh. Thank you for taking it beyond the café! A small message can open a whole new chapter.',
    vi: 'Lời chào tới chị Linh rồi. Cảm ơn bạn mang nó ra khỏi quán nha! Một lời nhắn nhỏ cũng mở được một chương mới.',
  },
  name: { en: 'Quynh', vi: 'Quỳnh' },
  roles: { en: 'Café reader', vi: 'Người đọc sách ở quán cà phê' },
  place: { en: 'the market', vi: 'chợ' },
  home: 'market',
  friendliness: -1,
  at: [-14, 28],
  look,
})

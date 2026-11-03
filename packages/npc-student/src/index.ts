import { defineResident, type NpcLook } from '@saigon/npc-kit'
import { activities } from './activities'

const look: NpcLook = {
  body: 'own',
  color: '#baddc1',
  portraitBg: 'var(--avatar-color)',
  animation: 'walk',
  avatar: true,
}

export default defineResident({
  activities,
  id: 'student',
  completion: {
    en: 'Thank you! That is one less thing to worry about between classes. I owe you a proper hello next time.',
    vi: 'Cảm ơn bạn nha! Giữa mấy buổi học, bớt được một chuyện là nhẹ cả người. Bữa sau gặp mình chào cho đàng hoàng nhé.',
  },
  helloPayoff: {
    en: 'Cô Hoa got my hello! Thank you. You have made my next market visit feel a little more like coming home.',
    vi: 'Cô Hoa nhận lời chào rồi! Cảm ơn bạn nha. Lần tới ghé chợ, mình thấy giống về nhà hơn một chút rồi.',
  },
  name: { en: 'Minh', vi: 'Minh' },
  roles: { en: 'Student', vi: 'Sinh viên' },
  place: { en: 'the park', vi: 'công viên' },
  home: 'park',
  at: [20, -1],
  walk: [6, 0],
  look,
})

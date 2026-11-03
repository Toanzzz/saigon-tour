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
  id: 'plaza-friends',
  completion: {
    en: 'Thanks for helping out. This square feels friendlier every time someone stops for a neighbor.',
    vi: 'Cảm ơn bạn đã giúp nha. Mỗi lần có người dừng lại vì hàng xóm, quảng trường này lại thân hơn một chút.',
  },
  helloPayoff: {
    en: 'Linh has our hello! Thanks for taking a little of this square over to the park. Next time we can wave her over too.',
    vi: 'Chị Linh nhận lời chào rồi! Cảm ơn bạn mang chút không khí quảng trường qua công viên nha. Bữa nào gặp thì rủ chị ngồi chung luôn.',
  },
  name: { en: 'Ha', vi: 'Hà' },
  roles: { en: 'Plaza neighbor', vi: 'Hàng xóm ở quảng trường' },
  place: { en: 'City Hall', vi: 'Tòa Thị Chính' },
  home: 'cityhall',
  at: [67, 3],
  look,
})

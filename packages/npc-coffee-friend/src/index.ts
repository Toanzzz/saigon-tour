import { defineResident, type NpcLook } from '@saigon/npc-kit'
import { activities } from './activities'

const look: NpcLook = {
  body: 'own',
  color: '#baddc1',
  portraitBg: 'var(--avatar-color)',
  animation: 'idle',
  avatar: true,
}

export default defineResident({
  activities,
  id: 'coffee-friend',
  completion: {
    en: 'Thanks, friend. That was kind of you. Come share a quiet coffee with us when you have a minute.',
    vi: 'Cảm ơn bạn nha, dễ thương quá. Lúc nào rảnh ghé ngồi uống cà phê với tụi mình một chút nhé.',
  },
  helloPayoff: {
    en: 'Linh got my hello! Thanks, friend. That is one more person to wave over when we have an empty café chair.',
    vi: 'Chị Linh nhận lời chào rồi! Cảm ơn bạn nha. Quán có ghế trống là lại có thêm người để rủ ngồi chung rồi.',
  },
  name: { en: 'Duc', vi: 'Anh Đức' },
  roles: { en: 'Coffee regular', vi: 'Khách quen quán cà phê' },
  place: { en: 'the market', vi: 'chợ' },
  home: 'market',
  at: [-36, 28],
  look,
})

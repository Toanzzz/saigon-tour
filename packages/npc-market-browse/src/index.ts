import { defineResident, type NpcLook } from '@saigon/npc-kit'
import { activities } from './activities'

const look: NpcLook = {
  body: 'own',
  color: '#baddc1',
  portraitBg: 'var(--avatar-color)',
  animation: 'idle',
  yaw: Math.PI,
  avatar: true,
}

export default defineResident({
  activities,
  id: 'market-browse',
  completion: {
    en: 'Thanks for making time for a neighbor. Little favors like yours make this market feel like home.',
    vi: 'Cảm ơn bạn đã dành chút thời gian giúp hàng xóm nha. Mấy chuyện nhỏ vậy thôi mà làm cái chợ thân quen hẳn.',
  },
  helloPayoff: {
    en: 'Linh has my hello. Thanks for making the trip! This market feels smaller, in a good way, when the neighbors know one another.',
    vi: 'Linh nhận lời chào rồi. Cảm ơn bạn đi giùm nha! Hàng xóm quen nhau, cái chợ tự nhiên gần gũi hơn hẳn.',
  },
  name: { en: 'Ngoc', vi: 'Ngọc' },
  roles: { en: 'Market regular', vi: 'Khách quen ở chợ' },
  place: { en: 'the market', vi: 'chợ' },
  home: 'market',
  at: [-30, 5.5],
  yaw: Math.PI,
  look,
})

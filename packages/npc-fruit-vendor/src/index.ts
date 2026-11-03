import { defineResident, type NpcLook } from '@saigon/npc-kit'
import { activities } from './activities'

const look: NpcLook = {
  body: 'own',
  color: '#baddc1',
  portraitBg: 'var(--avatar-color)',
  animation: 'holding-both',
  avatar: true,
}

export default defineResident({
  activities,
  id: 'fruit-vendor',
  completion: {
    en: 'Thank you, dear. You make a busy market day feel a little sweeter. Come back and say hello to me too.',
    vi: 'Cô cảm ơn con nha. Nhờ con mà ngày chợ bận rộn cũng ngọt hơn một chút. Bữa nào ghé chào cô nữa nhé.',
  },
  helloPayoff: {
    en: 'You passed my hello to Linh! Thank you, con. Good neighbors are the sweetest part of market day.',
    vi: 'Con gửi lời chào của cô tới chị Linh rồi! Cảm ơn con nha. Hàng xóm thương nhau mới là phần ngọt nhất buổi chợ.',
  },
  name: { en: 'Ms. Hanh', vi: 'Cô Hạnh' },
  roles: { en: 'Fruit vendor', vi: 'Người bán trái cây' },
  place: { en: 'the market', vi: 'chợ' },
  home: 'market',
  at: [-11, 2],
  look,
})

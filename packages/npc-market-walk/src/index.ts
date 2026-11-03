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
  id: 'market-walk',
  completion: {
    en: 'Thanks for taking that off my route. One less errand means I can catch my breath and actually say hello.',
    vi: 'Cảm ơn bạn đã đỡ mình một chuyến nha. Bớt một việc là mình có lúc thở, rồi chào mọi người cho đàng hoàng.',
  },
  helloPayoff: {
    en: 'My hello reached Linh! Thanks for covering that little route. Next time I pass the park, I will know a friend is there.',
    vi: 'Lời chào tới chị Linh rồi! Cảm ơn bạn chạy giùm đoạn đó nha. Lần sau ngang công viên là mình biết có người quen để chào rồi.',
  },
  name: { en: 'Dat', vi: 'Đạt' },
  roles: { en: 'Market courier', vi: 'Người giao hàng ở chợ' },
  place: { en: 'the market', vi: 'chợ' },
  home: 'market',
  at: [-17, 5.5],
  walk: [5, 0],
  look,
})

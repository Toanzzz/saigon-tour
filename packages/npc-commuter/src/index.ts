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
  id: 'commuter',
  completion: {
    en: 'Thanks for helping. A busy day feels different when someone takes a moment for you. See you around the stop.',
    vi: 'Cảm ơn bạn đã giúp nha. Đang vội mà có người để tâm tới mình, cả ngày cũng khác hẳn. Hẹn gặp quanh trạm nhé.',
  },
  helloPayoff: {
    en: 'You caught Linh with my hello! Thanks. I can make my next connection knowing that little visit is taken care of.',
    vi: 'Bạn gửi lời chào tới chị Linh rồi! Cảm ơn nha. Mình yên tâm bắt chuyến tiếp theo, khỏi nợ một lời hỏi thăm nữa.',
  },
  name: { en: 'Tuan', vi: 'Tuấn' },
  roles: { en: 'Commuter', vi: 'Người đi làm' },
  place: { en: 'the market', vi: 'chợ' },
  home: 'market',
  at: [1, 17.5],
  walk: [5, 0],
  phase: 2,
  look,
})

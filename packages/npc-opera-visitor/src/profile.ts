import type { NpcProfile } from '@saigon/npc-kit'

export const profile: NpcProfile = {
  kind: 'resident',
  friendliness: -2,
  names: { en: 'Diem', vi: 'Diễm' },
  text: {
    en: {
      role: 'Opera visitor',
      knowledge: [
        'I treat every evening at the Opera House like an opening night to be reviewed.',
        'I review the pigeons, the weather, and — forgive me — your entrance.',
      ],
    },
    vi: {
      role: 'Khách tham quan Nhà hát',
      knowledge: [
        'Mình xem mỗi tối ở Nhà hát như một đêm khai màn cần được bình.',
        'Mình chấm điểm bồ câu, thời tiết, và — bạn thứ lỗi — màn xuất hiện của bạn.',
      ],
    },
  },
  personality:
    'Exacting and theatrical; an opening-night critic who reviews pigeons, weather, and entrances',
  speakingStyle:
    'Wry, review-column tone with star ratings; a touch aloof but never cruel; calls the player bạn',
  home: 'opera',
  idle: {
    en: 'Your entrance, bạn: three stars. Confident stride, but the pigeon upstaged you.',
    vi: 'Màn xuất hiện của bạn: ba sao. Dáng đi tự tin, mà con bồ câu lấn át mất rồi.',
  },
}

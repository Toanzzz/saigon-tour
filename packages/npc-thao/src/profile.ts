import type { NpcProfile } from '@saigon/npc-kit'

export const profile: NpcProfile = {
  kind: 'neighbor',
  friendliness: 1,
  names: { en: 'Thao', vi: 'Thảo' },
  text: {
    en: {
      role: 'Opera House music student',
      knowledge: [
        'The Opera House steps are a lovely place to hear the city breathe.',
        'The cathedral square carries a clear echo between its facades.',
        'A short walk can turn a melody into a memory.',
      ],
    },
    vi: {
      role: 'Sinh viên âm nhạc ở Nhà hát',
      knowledge: [
        'Bậc thềm Nhà hát là nơi đẹp để nghe thành phố thở.',
        'Quảng trường nhà thờ vang tiếng vọng rõ giữa các mặt tiền.',
        'Một chuyến đi bộ ngắn có thể biến giai điệu thành kỷ niệm.',
      ],
    },
  },
  personality: 'Bright, earnest, and attentive to small sounds around the city',
  speakingStyle: 'Warm, musical, and a little shy when sharing a secret',
  home: 'opera',
}

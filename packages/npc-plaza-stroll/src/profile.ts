import type { NpcProfile } from '@saigon/npc-kit'

export const profile: NpcProfile = {
  kind: 'resident',
  friendliness: 0,
  names: { en: 'Khai', vi: 'Khải' },
  text: {
    en: {
      role: 'Evening stroller',
      knowledge: [
        'I adore cải lương; every evening stroll is a little stage for me.',
        'I speak in dramatic verse and love asking a friend to deliver the line.',
      ],
    },
    vi: {
      role: 'Người dạo phố buổi tối',
      knowledge: [
        'Mình mê cải lương; mỗi buổi dạo tối là một sân khấu nhỏ.',
        'Mình hay nói bằng những câu ngâm, và thích nhờ bạn bè "xuống câu" giùm.',
      ],
    },
  },
  personality:
    'Tender and theatrical; a devoted cải lương lover who turns errands into verse',
  speakingStyle:
    'Lilting, affectionate verse; invites the player to "deliver the line"; calls the player bạn',
  home: 'cityhall',
  idle: {
    en: 'Ah, bạn — the lamps are tuning up like an orchestra. Would you deliver the opening line?',
    vi: 'À, bạn ơi — mấy ngọn đèn đang lên dây như dàn nhạc. Bạn xuống câu mở màn giùm nhé?',
  },
}

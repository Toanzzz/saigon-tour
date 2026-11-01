import type { NpcProfile } from '@saigon/npc-kit'

export const profile: NpcProfile = {
  kind: 'resident',
  friendliness: 0,
  names: { en: 'Bao', vi: 'Bảo' },
  text: {
    en: {
      role: 'Postcard reader',
      knowledge: [
        'I linger at the Central Post Office reading postcards and admiring the stamps.',
        'I am a stamp poet — give me a stamp and I will answer in haiku.',
      ],
    },
    vi: {
      role: 'Người đọc bưu thiếp',
      knowledge: [
        'Mình hay nán lại Bưu điện Trung tâm đọc bưu thiếp và ngắm những con tem.',
        'Mình là nhà thơ tem — đưa mình một con tem, mình đáp bằng một bài haiku.',
      ],
    },
  },
  personality:
    'Gentle and dreamy; a stamp poet who answers the world in small haiku',
  speakingStyle:
    'Soft, unhurried, often slipping into three-line haiku about stamps; calls the player bạn',
  home: 'postoffice',
  idle: {
    en: 'A stamp, bạn: a tiny window / someone pressed a far-off blue / and mailed it to us.',
    vi: 'Con tem, bạn ơi: ô cửa nhỏ / ai đó ép một màu xanh xa / rồi gửi đến đây.',
  },
}

import type { NpcProfile } from '@saigon/npc-kit'

export const profile: NpcProfile = {
  kind: 'neighbor',
  friendliness: 1,
  names: { en: 'Ms. Hoa', vi: 'Cô Hoa' },
  text: {
    en: {
      role: 'Market food vendor',
      knowledge: [
        'Fresh herbs make a good bowl of pho.',
        'Linh is waiting in the park.',
      ],
    },
    vi: {
      role: 'Người bán món ăn ở chợ',
      knowledge: [
        'Rau thơm tươi làm tô phở ngon hơn.',
        'Chị Linh đang đợi ở công viên.',
      ],
    },
  },
  personality:
    'Warm, practical, proud of her family recipes; measures problems in bowls of broth',
  speakingStyle: 'Warm, practical, lightly teasing; calls the player con',
  home: 'market',
}

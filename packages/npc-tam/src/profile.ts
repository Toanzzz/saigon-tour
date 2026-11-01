import type { NpcProfile } from '@saigon/npc-kit'

export const profile: NpcProfile = {
  kind: 'neighbor',
  friendliness: 1,
  names: { en: 'Tam', vi: 'Anh Tâm' },
  text: {
    en: {
      role: 'Neighborhood driver',
      knowledge: [
        'The park bus costs 5 coins.',
        'The city is easy to explore on foot.',
      ],
    },
    vi: {
      role: 'Tài xế trong khu phố',
      knowledge: [
        'Xe buýt ra công viên giá 5 xu.',
        'Đi bộ khám phá thành phố rất dễ.',
      ],
    },
  },
  personality: 'Cheerful and helpful, knows every shortcut',
  speakingStyle: 'Short, encouraging directions',
  home: 'market',
}

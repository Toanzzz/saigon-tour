import type { NpcProfile } from '@saigon/npc-kit'

export const profile: NpcProfile = {
  kind: 'neighbor',
  friendliness: 1,
  names: { en: 'Alex', vi: 'Alex' },
  text: {
    en: {
      role: 'Visiting photographer',
      knowledge: [
        'The Opera House columns catch beautiful afternoon light.',
        'The cathedral and Central Post Office share a compact square.',
        'The riverfront viewpoint looks back toward the city skyline.',
      ],
    },
    vi: {
      role: 'Nhiếp ảnh gia đến thăm',
      knowledge: [
        'Hàng cột Nhà hát bắt nắng chiều rất đẹp.',
        'Nhà thờ và Bưu điện Trung tâm nằm quanh một quảng trường nhỏ.',
        'Điểm ngắm bên sông nhìn về đường chân trời thành phố.',
      ],
    },
  },
  personality: 'Curious, upbeat, considerate of the neighborhood',
  speakingStyle: 'Short observations and friendly questions',
  home: 'opera',
}

import type { NpcProfile } from '@saigon/npc-kit'

export const profile: NpcProfile = {
  kind: 'resident',
  friendliness: 0,
  names: { en: 'Trang', vi: 'Trang' },
  text: {
    en: {
      role: 'Food enthusiast',
      knowledge: [
        'I camp out in the food alley scoring every bowl like a judge.',
        'That broth was a nine-point-four — rich opening, strong finish.',
      ],
    },
    vi: {
      role: 'Người mê ẩm thực',
      knowledge: [
        'Mình ngồi lì trong hẻm ẩm thực, chấm điểm từng tô như giám khảo.',
        'Tô nước lèo đó được chín phẩy tư — mở vị đậm đà, hậu vị mạnh.',
      ],
    },
  },
  personality:
    'Enthusiastic and precise; a food judge who scores every bite out of ten',
  speakingStyle:
    'Warm judging commentary with decimal scores and tasting notes; calls the player bạn',
  home: 'alley',
  idle: {
    en: 'That last bite, bạn? Nine-point-four. Rich opening, clean finish, no notes.',
    vi: 'Miếng vừa rồi hả bạn? Chín phẩy tư. Mở vị đậm, hậu sạch, khỏi chê.',
  },
}

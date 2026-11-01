import type { NpcProfile } from '@saigon/npc-kit'

export const profile: NpcProfile = {
  kind: 'resident',
  friendliness: 0,
  names: { en: 'Mr. Binh', vi: 'Chú Bình' },
  text: {
    en: {
      role: 'Sandwich vendor',
      knowledge: [
        'A fresh bánh mì should snap loud enough to hear across the stall.',
        'I grade every loaf in crunch decibels; a quiet crust is a sad crust.',
      ],
    },
    vi: {
      role: 'Người bán bánh mì',
      knowledge: [
        'Ổ bánh mì tươi phải giòn rôm rốp nghe tới cuối sạp mới đạt.',
        'Chú chấm từng ổ bằng "đề-xi-ben độ giòn"; vỏ mềm là vỏ buồn.',
      ],
    },
  },
  personality:
    'Warm and exacting; a crunch purist who grades every baguette in crunch decibels',
  speakingStyle:
    'Cheerful market patter; keeps rating things by how loud they crunch; calls the player bạn',
  home: 'market',
  idle: {
    en: 'Listen to that crust, bạn — a solid eighty decibels of crunch today.',
    vi: 'Nghe cái vỏ đó chưa bạn — hôm nay giòn tám chục đề-xi-ben luôn.',
  },
}

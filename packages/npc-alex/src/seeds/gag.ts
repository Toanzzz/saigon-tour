import type { SeedQuest } from '@saigon/npc-kit'

/** Alex chases "the authentic shot"; something always photobombs. */
export const gag: SeedQuest = {
  scope: 'solo',
  steps: [{ type: 'DELIVER', itemId: 'photo', npcId: 'son' }],
  text: {
    en: {
      title: 'The authentic shot',
      description:
        'Bring this photo to Sơn at the post office. It is my most authentic shot of the Opera House. There is a pigeon mid-blink in the corner. It completes it.',
    },
    vi: {
      title: 'Tấm ảnh chân thật',
      description:
        'Mang tấm ảnh này cho Sơn ở bưu điện. Đây là tấm Nhà hát chân thật nhất của mình. Góc ảnh có con bồ câu đang chớp mắt. Nó làm nên tấm hình.',
    },
  },
  payoff: {
    en: 'Sơn has my Opera House photo. Thank you! Now the pigeon has an audience, and I have another reason to keep the accidental shots.',
    vi: 'Sơn nhận tấm hình Nhà hát rồi. Cảm ơn bạn nha! Bồ câu có khán giả, còn mình có thêm lý do giữ mấy tấm chụp tình cờ.',
  },
}

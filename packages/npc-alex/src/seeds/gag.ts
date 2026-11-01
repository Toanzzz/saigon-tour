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
    en: 'Sơn liked the pigeon more than the Opera House. Honestly? So do I now.',
    vi: 'Sơn thích con bồ câu hơn cả Nhà hát. Thành thật mà nói? Giờ mình cũng vậy.',
  },
}

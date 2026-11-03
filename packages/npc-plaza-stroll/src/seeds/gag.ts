import type { SeedQuest } from '@saigon/npc-kit'

/** Khải's running gag: errands become verse, and he asks the player to deliver the line. */
export const gag: SeedQuest = {
  scope: 'solo',
  steps: [{ type: 'DELIVER', itemId: 'postcard', npcId: 'alex' }],
  text: {
    en: {
      title: 'Deliver the line',
      description:
        'I have penned a single trembling verse on this postcard, bạn. Carry it to anh Alex at the Opera House and, when you hand it over, deliver the line out loud — gently, like the lamps are listening.',
    },
    vi: {
      title: 'Xuống câu giùm nhé',
      description:
        'Mình đã đề một câu ngâm run run lên tấm bưu thiếp này, bạn ơi. Mang qua cho anh Alex ở Nhà hát, và khi trao thì xuống câu thành tiếng — nhẹ thôi, như thể đèn đang lắng nghe.',
    },
  },
  payoff: {
    en: 'Alex has the verse! Thank you, bạn. A small postcard found its stage, and your kind delivery deserves an encore.',
    vi: 'Anh Alex nhận câu ngâm rồi! Cảm ơn bạn nha. Tấm thiệp nhỏ tìm được sân khấu, còn người mang lời tới đáng được vỗ tay thêm.',
  },
}

import type { SeedQuest } from '@saigon/npc-kit'

/** Sơn writes postcards to places, not people. */
export const gag: SeedQuest = {
  scope: 'solo',
  steps: [{ type: 'DELIVER', itemId: 'postcard', npcId: 'ba' }],
  text: {
    en: {
      title: 'Dear River, you looked tired today',
      description:
        'Deliver this postcard to Ông Ba by the river. It is addressed to the river itself: "Dear River, you looked tired today. Rest up. Warmly, Sơn."',
    },
    vi: {
      title: 'Gửi Dòng Sông, hôm nay trông mệt quá',
      description:
        'Mang tấm bưu thiếp này cho Ông Ba ở bờ sông. Nó gửi cho chính dòng sông: "Gửi Dòng Sông, hôm nay trông mệt quá. Nghỉ ngơi nhé. Thân, Sơn."',
    },
  },
  payoff: {
    en: 'Ông Ba read it to the river out loud. The river said nothing, which Sơn took as deep agreement.',
    vi: 'Ông Ba đọc to cho dòng sông nghe. Dòng sông không nói gì, mà Sơn hiểu đó là sự đồng tình sâu sắc.',
  },
}

import type { SeedQuest } from '@saigon/npc-kit'

/**
 * Alex's arc: chasing the authentic shot. Scout the cathedral square, ask Son
 * for a subject, then bring the photo to Vy — until Son points out the real
 * subject is the cyclo in the corner, which belongs to Ba.
 */
export const arc: SeedQuest = {
  scope: 'solo',
  steps: [
    { type: 'GO_TO', locationId: 'cathedral' },
    { type: 'TALK_TO', npcId: 'son' },
    { type: 'DELIVER', itemId: 'photo', npcId: 'vy' },
  ],
  text: {
    en: {
      title: 'The authentic shot',
      description:
        'I am chasing the authentic shot. Scout the cathedral square for the light, ask Son what to frame, then deliver the photo to Vy before a pigeon photobombs the whole plan.',
    },
    vi: {
      title: 'Khung hình chân thật',
      description:
        'Mình đang săn khung hình chân thật. Ra quảng trường nhà thờ tìm ánh sáng, hỏi Sơn nên chụp gì, rồi mang tấm hình giao cho Vy trước khi có con bồ câu nhảy vô phá khung hình.',
    },
  },
  twist: {
    step: { type: 'DELIVER', itemId: 'photo', npcId: 'ba' },
    line: {
      en: 'Son: the best subject is the cyclo in the corner, and it is Ba\u2019s. The photo belongs to him.',
      vi: 'Sơn: chủ thể đẹp nhất là chiếc xích lô ở góc hình kìa, mà nó là của ông Ba. Tấm hình này phải đưa ông mới đúng.',
    },
  },
  payoff: {
    en: 'Ba loved the cyclo in the corner? Of course. The authentic shot is always the one you did not frame.',
    vi: 'Ông Ba mê chiếc xích lô ở góc hình hả? Dĩ nhiên rồi. Khung hình chân thật luôn là cái mình không cố chụp.',
  },
}

import type { SeedQuest } from '@saigon/npc-kit'

/** Thảo hears melodies in city noise and composes tiny ballads. */
export const gag: SeedQuest = {
  scope: 'solo',
  steps: [{ type: 'DELIVER', itemId: 'coffee', npcId: 'son' }],
  text: {
    en: {
      title: 'A little ballad for the errand',
      description:
        'Bring this coffee to Sơn at the post office. I am composing a tiny ballad about your footsteps; try to walk in a nice rhythm so the chorus works.',
    },
    vi: {
      title: 'Khúc ballad nhỏ cho chuyến đi',
      description:
        'Mang ly cà phê này cho Sơn ở bưu điện. Mình đang soạn một khúc ballad nhỏ về bước chân bạn; đi nhịp nhàng chút để điệp khúc nghe cho hay nhé.',
    },
  },
  payoff: {
    en: 'Sơn has his coffee. Thank you for carrying the rhythm across the city! I think the chorus will be named after your shoes.',
    vi: 'Sơn có cà phê rồi. Cảm ơn bạn mang cả nhịp chân qua phố nha! Chắc mình đặt tên điệp khúc theo đôi giày của bạn quá.',
  },
}

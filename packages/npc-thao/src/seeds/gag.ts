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
    en: 'The chorus landed on the last step to Sơn. I am naming the song after your shoes.',
    vi: 'Điệp khúc rơi đúng vào bước chân cuối tới chỗ Sơn. Mình sẽ đặt tên bài hát theo đôi giày của bạn.',
  },
}

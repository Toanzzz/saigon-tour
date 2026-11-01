import type { SeedQuest } from '@saigon/npc-kit'

/**
 * Thảo's riddle. A hidden step 0 the city reveals: the answer is the
 * red-brick cathedral on the square. Red herring: the pigeons.
 */
export const riddle: SeedQuest = {
  scope: 'solo',
  steps: [{ type: 'GO_TO', locationId: 'cathedral' }],
  riddle: {
    text: {
      en: 'Two red-brick bell towers keep the square\u2019s best echo. The pigeons only pretend to conduct. Stand where it answers.',
      vi: 'Hai th\u00e1p chu\u00f4ng g\u1ea1ch \u0111\u1ecf gi\u1eef ti\u1ebfng v\u1ecdng \u0111\u1eb9p nh\u1ea5t c\u1ee7a qu\u1ea3ng tr\u01b0\u1eddng. M\u1ea5y ch\u00fa b\u1ed3 c\u00e2u ch\u1ec9 gi\u1ea3 b\u1ed9 b\u1eaft nh\u1ecbp th\u00f4i. \u0110\u1ebfn n\u01a1i n\u00f3 v\u1ecdng l\u1ea1i.',
    },
  },
  text: {
    en: {
      title: 'A riddle for the echo',
      description:
        'I caught a melody in the square and set it as a riddle. Solve where it lives, or let a neighbor or a cyclo tell you.',
    },
    vi: {
      title: 'Câu đố cho tiếng vọng',
      description:
        'Mình bắt được một giai điệu ngoài quảng trường và đố bạn. Đoán xem nó ở đâu, hoặc để hàng xóm hay bác xích lô mách cho.',
    },
  },
  payoff: {
    en: 'You found the echo yourself. Now the ballad has a proper first verse.',
    vi: 'Bạn tự tìm ra tiếng vọng rồi. Giờ khúc ballad đã có đoạn mở đầu đàng hoàng.',
  },
}

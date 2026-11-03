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
      vi: 'Hai tháp chuông gạch đỏ giữ tiếng vọng đẹp nhất quảng trường. Bồ câu chỉ giả bộ bắt nhịp thôi. Đến nơi tiếng vọng trả lời nhé.',
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
    en: 'You found the echo! Thank you for listening so closely. However you found your way, my little ballad has a first verse now.',
    vi: 'Bạn tìm được tiếng vọng rồi! Cảm ơn đã chịu lắng nghe nha. Dù tìm đường cách nào, khúc ballad nhỏ của mình cũng có câu mở đầu rồi.',
  },
}

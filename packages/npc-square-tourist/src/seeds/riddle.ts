import type { SeedQuest } from '@saigon/npc-kit'

/** Square tourist's riddle. Hidden step 0: Vy, who names every lantern. */
export const riddle: SeedQuest = {
  scope: 'solo',
  steps: [{ type: 'TALK_TO', npcId: 'vy' }],
  riddle: {
    text: {
      en: 'Find the neighbor who gives every paper lantern a dramatic name before dusk. My 1998 map is no help; ask them to point.',
      vi: 'Tìm người hàng xóm đặt cho mỗi chiếc lồng đèn giấy một cái tên thật kịch tính trước khi trời tối. Tấm bản đồ 1998 của tôi chịu; nhờ họ chỉ đường.',
    },
  },
  text: {
    en: {
      title: 'A riddle, map optional',
      description:
        'I am proudly lost, so I made a riddle about a neighbor instead. Guess who, or let a neighbor or a cyclo say the name.',
    },
    vi: {
      title: 'Câu đố, khỏi cần bản đồ',
      description:
        'Tôi lạc đường một cách tự hào, nên đố bạn về một người hàng xóm. Đoán xem là ai, hoặc để hàng xóm hay bác xích lô nói tên.',
    },
  },
  payoff: {
    en: 'You found them without the map. I will note this landmark the way I find everything: by accident.',
    vi: 'Bạn tìm ra mà chẳng cần bản đồ. Tôi sẽ ghi lại cột mốc này theo cách tôi tìm mọi thứ: tình cờ.',
  },
}

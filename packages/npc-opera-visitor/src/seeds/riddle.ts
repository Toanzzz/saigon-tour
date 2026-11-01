import type { SeedQuest } from '@saigon/npc-kit'

/** Opera visitor's riddle. Hidden step 0: Alex, the photographer. */
export const riddle: SeedQuest = {
  scope: 'solo',
  steps: [{ type: 'TALK_TO', npcId: 'alex' }],
  riddle: {
    text: {
      en: 'Find the neighbor who freezes a single moment and swears the pigeon planned the photobomb. Ask them for the review.',
      vi: 'Tìm người hàng xóm hay bắt lấy một khoảnh khắc rồi thề là con bồ câu cố tình phá ảnh. Hỏi họ lời nhận xét nhé.',
    },
  },
  text: {
    en: {
      title: 'A riddle for opening night',
      description:
        'I turned tonight\u2019s review into a riddle about a neighbor. Deduce who, or let a neighbor or a cyclo name them.',
    },
    vi: {
      title: 'Câu đố cho đêm khai diễn',
      description:
        'Mình biến bài nhận xét tối nay thành câu đố về một người hàng xóm. Đoán xem là ai, hoặc để hàng xóm hay bác xích lô gọi tên.',
    },
  },
  payoff: {
    en: 'You found my critic without a program note. Four stars for the entrance.',
    vi: 'Bạn tìm ra nhà phê bình của mình mà chẳng cần tờ chương trình. Bốn sao cho màn vào cửa.',
  },
}

import type { SeedQuest } from '@saigon/npc-kit'

/** Son's riddle. Hidden step 0: the vaulted Central Post Office hall. */
export const riddle: SeedQuest = {
  scope: 'solo',
  steps: [{ type: 'GO_TO', locationId: 'postoffice' }],
  riddle: {
    text: {
      en: 'A vaulted hall where old clocks pretend to be windows and the whole city mails its small stories. Begin where the letters wait.',
      vi: 'Gian sảnh mái vòm, mấy cái đồng hồ cũ giả làm cửa sổ, cả thành phố gửi những mẩu chuyện nhỏ ở đó. Bắt đầu nơi thư đang chờ.',
    },
  },
  text: {
    en: {
      title: 'A riddle for the letters',
      description:
        'Dear Reader: I hid my favorite hall in a riddle. Guess where it stands, or let a neighbor or a cyclo read it aloud.',
    },
    vi: {
      title: 'Câu đố cho những lá thư',
      description:
        'Gửi bạn đọc: mình giấu gian sảnh mình thích trong một câu đố. Đoán xem nó ở đâu, hoặc để hàng xóm hay bác xích lô đọc giúp.',
    },
  },
  payoff: {
    en: 'You found the place in my riddle. Thank you, dear reader! For once, the postcard has written back.',
    vi: 'Bạn tìm được nơi trong câu đố rồi. Cảm ơn bạn đọc thân mến nha! Lần này tấm bưu thiếp có hồi âm thật rồi.',
  },
}

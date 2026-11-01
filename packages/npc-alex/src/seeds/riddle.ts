import type { SeedQuest } from '@saigon/npc-kit'

/** Alex's riddle. Hidden step 0: the grand-staircase stage of the Opera House. */
export const riddle: SeedQuest = {
  scope: 'solo',
  steps: [{ type: 'GO_TO', locationId: 'opera' }],
  riddle: {
    text: {
      en: 'Velvet curtains, a grand staircase, and a façade that poses for every photo. Even latecomers get reviewed here. Find the stage.',
      vi: 'Rèm nhung, bậc thang bề thế, mặt tiền lúc nào cũng tạo dáng cho ảnh. Tới trễ cũng bị chấm điểm. Tìm sân khấu đó đi.',
    },
  },
  text: {
    en: {
      title: 'A riddle worth a frame',
      description:
        'I set the best backdrop in town as a riddle. Work out where it stands, or let a neighbor or a cyclo give it away.',
    },
    vi: {
      title: 'Câu đố đáng một khung hình',
      description:
        'Mình biến phông nền đẹp nhất phố thành câu đố. Đoán xem nó ở đâu, hoặc để hàng xóm hay bác xích lô bật mí.',
    },
  },
  payoff: {
    en: 'You framed it without a hint. The pigeon still photobombed, but that is on the pigeon.',
    vi: 'Bạn canh được khung mà không cần gợi ý. Con bồ câu vẫn phá ảnh, mà đó là lỗi của nó.',
  },
}

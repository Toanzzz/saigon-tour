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
    en: 'You found my backdrop! Thanks for following the light with me. A hint or a happy guess, that frame is yours now.',
    vi: 'Bạn tìm được phông nền rồi! Cảm ơn đã cùng mình lần theo ánh sáng nha. Nhờ gợi ý hay đoán trúng thì khung hình này cũng là của bạn.',
  },
}

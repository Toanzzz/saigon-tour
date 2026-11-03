import type { SeedQuest } from '@saigon/npc-kit'

/** Diễm's running gag: she reviews everything with star ratings, entrances included. */
export const gag: SeedQuest = {
  scope: 'solo',
  steps: [{ type: 'DELIVER', itemId: 'photo', npcId: 'thao' }],
  text: {
    en: {
      title: 'A four-star entrance',
      description:
        'I am filing tonight\u2019s review, bạn. Carry this photo to chị Thảo at the Opera House and make your entrance count — I am scoring it, and the pigeons are an expert panel.',
    },
    vi: {
      title: 'Màn xuất hiện bốn sao',
      description:
        'Mình đang viết bài bình tối nay, bạn. Mang tấm ảnh này cho chị Thảo ở Nhà hát và xuất hiện cho ra dáng — mình chấm điểm đó, mà ban giám khảo bồ câu khó tính lắm.',
    },
  },
  payoff: {
    en: 'Thảo has the photo. Thank you, bạn! Four stars for the delivery; the pigeons are lobbying for a fifth.',
    vi: 'Thảo nhận ảnh rồi. Cảm ơn bạn nha! Bốn sao cho chuyến giao; mấy con bồ câu đang vận động thêm sao thứ năm.',
  },
}

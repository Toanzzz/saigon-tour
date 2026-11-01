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
    en: 'Thảo took the photo and your entrance held? Four stars, bạn. The pigeons wanted five; they always overrate.',
    vi: 'Chị Thảo nhận ảnh mà màn xuất hiện của bạn vững hả? Bốn sao đó bạn. Bồ câu đòi năm; tụi nó lúc nào cũng chấm lố.',
  },
}

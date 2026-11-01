import type { SeedQuest } from '@saigon/npc-kit'

/** Postcard reader's riddle. Hidden step 0: deliver a postcard to Son. */
export const riddle: SeedQuest = {
  scope: 'solo',
  steps: [{ type: 'DELIVER', itemId: 'postcard', npcId: 'son' }],
  riddle: {
    text: {
      en: 'Carry this card to the neighbor who mails letters to the river and never waits for a reply. He will know the stamp.',
      vi: 'Mang tấm thiệp này đến người hàng xóm hay gửi thư cho dòng sông mà chẳng bao giờ chờ hồi âm. Anh ấy sẽ biết con tem.',
    },
  },
  text: {
    en: {
      title: 'A stamp-poem riddle',
      description:
        'A haiku for a hidden address. Work out who receives this postcard, or let a neighbor or a cyclo tell you.',
    },
    vi: {
      title: 'Câu đố thơ con tem',
      description:
        'Một bài haiku cho địa chỉ còn giấu. Đoán xem ai nhận tấm bưu thiếp này, hoặc để hàng xóm hay bác xích lô mách cho.',
    },
  },
  payoff: {
    en: 'Delivered to the right poet. Stamp, address, and riddle: all three finally rhyme.',
    vi: 'Giao đúng cho nhà thơ rồi. Con tem, địa chỉ, và câu đố: cuối cùng cả ba cũng vần.',
  },
}

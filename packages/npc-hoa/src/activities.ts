import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    conversationHints: {
      first: {
        en: 'Ask {name} about the bowls being prepared.',
        vi: 'Hỏi {name} về những bát đồ ăn đang được chuẩn bị.',
      },
      returning: {
        en: 'Catch up with {name} about the stall.',
        vi: 'Trò chuyện tiếp với {name} về quầy hàng.',
      },
    },
    text: {
      en: '{name} is arranging bowls for nearby neighbors.',
      vi: '{name} đang xếp bát cho hàng xóm.',
    },
    animation: 'interact-right',
  },
  busy: {
    conversationHints: {
      first: {
        en: 'Ask {name} what is in the next order.',
        vi: 'Hỏi {name} đơn tiếp theo có món gì.',
      },
      returning: {
        en: 'Check in with {name} between orders.',
        vi: 'Hỏi thăm {name} lúc rảnh giữa các đơn hàng.',
      },
    },
    text: {
      en: '{name} is holding a warm bowl, checking the next order.',
      vi: '{name} đang bưng bát nóng, xem đơn tiếp theo.',
    },
    animation: 'holding-both',
    prop: 'food/bowl-soup',
  },
} satisfies NpcActivities

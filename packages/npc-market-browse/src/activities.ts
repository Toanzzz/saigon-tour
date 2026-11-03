import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    conversationHints: {
      first: {
        en: 'Ask {name} what they are browsing for.',
        vi: 'Hỏi {name} đang tìm mua gì.',
      },
      returning: {
        en: 'See what {name} has found around the market.',
        vi: 'Hỏi xem {name} tìm thấy gì thú vị trong chợ.',
      },
    },
    text: {
      en: '{name} is browsing the market stalls.',
      vi: '{name} đang ngắm các sạp hàng trong chợ.',
    },
    animation: 'idle',
  },
  busy: {
    conversationHints: {
      first: {
        en: 'Ask {name} about the stall that caught their eye.',
        vi: 'Hỏi {name} về sạp hàng khiến họ chú ý.',
      },
      returning: {
        en: 'Compare market discoveries with {name}.',
        vi: 'Trò chuyện với {name} về những điều thú vị trong chợ.',
      },
    },
    text: {
      en: '{name} is pointing toward an interesting stall.',
      vi: '{name} đang chỉ về một sạp hàng vừa để ý.',
    },
    animation: 'interact-right',
  },
} satisfies NpcActivities

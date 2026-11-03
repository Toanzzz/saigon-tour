import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    conversationHints: {
      first: {
        en: 'Ask {name} which fruit they would recommend.',
        vi: 'Hỏi {name} gợi ý loại trái cây nào.',
      },
      returning: {
        en: 'Compare fruit favorites with {name}.',
        vi: 'Trò chuyện với {name} về những loại trái cây yêu thích.',
      },
    },
    text: {
      en: '{name} is arranging the fruit stall.',
      vi: '{name} đang sắp xếp quầy trái cây.',
    },
    animation: 'interact-left',
  },
  busy: {
    conversationHints: {
      first: {
        en: 'Ask {name} how business is going.',
        vi: 'Hỏi {name} hôm nay buôn bán thế nào.',
      },
      returning: {
        en: 'Catch up with {name} while the stall is quiet.',
        vi: 'Hỏi thăm {name} lúc quầy vắng khách.',
      },
    },
    text: {
      en: '{name} is watching for the next customer.',
      vi: '{name} đang chờ vị khách tiếp theo.',
    },
    animation: 'idle',
  },
} satisfies NpcActivities

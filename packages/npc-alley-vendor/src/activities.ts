import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    conversationHints: {
      first: {
        en: 'Ask {name} what is cooking at the stall.',
        vi: 'Hỏi {name} đang nấu món gì ở quầy.',
      },
      returning: {
        en: 'Catch up with {name} about the food stall.',
        vi: 'Trò chuyện tiếp với {name} về quầy đồ ăn.',
      },
    },
    text: {
      en: '{name} is tending the food stall in the alley.',
      vi: '{name} đang chăm nom quầy đồ ăn trong hẻm.',
    },
    animation: 'interact-right',
  },
  busy: {
    conversationHints: {
      first: {
        en: 'Ask {name} about the bowl they are serving.',
        vi: 'Hỏi {name} về món ăn đang được bưng ra.',
      },
      returning: {
        en: 'Check in with {name} between orders.',
        vi: 'Hỏi thăm {name} lúc rảnh giữa các lượt khách.',
      },
    },
    text: {
      en: '{name} is holding a bowl for the next customer.',
      vi: '{name} đang bưng bát cho vị khách tiếp theo.',
    },
    animation: 'holding-both',
    prop: 'food/bowl-soup',
  },
} satisfies NpcActivities

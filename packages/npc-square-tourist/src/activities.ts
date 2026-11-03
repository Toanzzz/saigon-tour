import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    conversationHints: {
      first: {
        en: 'Ask {name} how their visit to the square is going.',
        vi: 'Hỏi {name} tham quan quảng trường thế nào.',
      },
      returning: {
        en: 'Catch up with {name} about exploring the square.',
        vi: 'Trò chuyện tiếp với {name} về việc khám phá quảng trường.',
      },
    },
    text: {
      en: '{name} is wandering slowly around the square.',
      vi: '{name} đang thong thả đi quanh quảng trường.',
    },
    animation: 'walk',
    movement: 'walk',
  },
  busy: {
    conversationHints: {
      first: {
        en: 'Ask {name} what they are admiring in the square.',
        vi: 'Hỏi {name} đang ngắm điều gì ở quảng trường.',
      },
      returning: {
        en: 'Compare favorite sights with {name}.',
        vi: 'Trò chuyện với {name} về những cảnh đẹp yêu thích.',
      },
    },
    text: {
      en: '{name} is stopping to admire the square.',
      vi: '{name} đang dừng lại ngắm quảng trường.',
    },
    animation: 'idle',
  },
} satisfies NpcActivities

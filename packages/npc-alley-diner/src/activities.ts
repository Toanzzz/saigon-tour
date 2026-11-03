import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    conversationHints: {
      first: {
        en: 'Ask {name} what they like to eat in the alley.',
        vi: 'Hỏi {name} thích ăn món gì trong hẻm.',
      },
      returning: {
        en: 'Swap food recommendations with {name}.',
        vi: 'Trao đổi với {name} về những món ăn ngon.',
      },
    },
    text: {
      en: '{name} is sitting beside the alley food stalls.',
      vi: '{name} đang ngồi bên các quầy đồ ăn trong hẻm.',
    },
    animation: 'sit',
  },
  busy: {
    conversationHints: {
      first: {
        en: 'Ask {name} about the bustle around the food stalls.',
        vi: 'Hỏi {name} về cảnh nhộn nhịp quanh các quầy đồ ăn.',
      },
      returning: {
        en: 'Catch up with {name} about the food alley.',
        vi: 'Trò chuyện tiếp với {name} về hẻm đồ ăn.',
      },
    },
    text: {
      en: '{name} is watching the bustle of the food alley from a seat.',
      vi: '{name} đang ngồi ngắm cảnh nhộn nhịp trong hẻm đồ ăn.',
    },
    animation: 'sit',
  },
} satisfies NpcActivities

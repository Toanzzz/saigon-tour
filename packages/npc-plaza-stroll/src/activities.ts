import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    conversationHints: {
      first: {
        en: 'Ask {name} about their walk through the square.',
        vi: 'Hỏi {name} về buổi dạo quanh quảng trường.',
      },
      returning: {
        en: 'Catch up with {name} on their stroll.',
        vi: 'Trò chuyện tiếp với {name} trong lúc dạo bước.',
      },
    },
    text: {
      en: '{name} is strolling through the square.',
      vi: '{name} đang dạo bước qua quảng trường.',
    },
    animation: 'walk',
    movement: 'walk',
  },
  busy: {
    conversationHints: {
      first: {
        en: 'Ask {name} what made them stop here.',
        vi: 'Hỏi {name} điều gì khiến họ dừng chân ở đây.',
      },
      returning: {
        en: 'Share a moment in the square with {name}.',
        vi: 'Dừng chân trò chuyện với {name} ở quảng trường.',
      },
    },
    text: {
      en: '{name} is pausing to take in the square.',
      vi: '{name} đang dừng lại ngắm quảng trường.',
    },
    animation: 'idle',
  },
} satisfies NpcActivities

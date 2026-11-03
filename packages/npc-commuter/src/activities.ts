import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    conversationHints: {
      first: {
        en: 'Ask {name} how the commute is going.',
        vi: 'Hỏi {name} hôm nay đi làm thế nào.',
      },
      returning: {
        en: 'Catch up with {name} about the neighborhood.',
        vi: 'Trò chuyện tiếp với {name} về khu phố.',
      },
    },
    text: {
      en: '{name} is walking along a familiar street.',
      vi: '{name} đang đi trên con đường quen thuộc.',
    },
    animation: 'walk',
    movement: 'walk',
  },
  busy: {
    conversationHints: {
      first: {
        en: 'Check whether {name} has a moment to chat.',
        vi: 'Hỏi {name} có rảnh trò chuyện một lát không.',
      },
      returning: {
        en: 'Check in with {name} during the pause.',
        vi: 'Tranh thủ lúc nghỉ chân để hỏi thăm {name}.',
      },
    },
    text: {
      en: '{name} is pausing beside the street.',
      vi: '{name} đang dừng chân bên đường.',
    },
    animation: 'idle',
  },
} satisfies NpcActivities

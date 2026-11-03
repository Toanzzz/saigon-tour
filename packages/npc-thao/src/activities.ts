import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    conversationHints: {
      first: {
        en: 'Ask {name} about the sounds of the neighborhood.',
        vi: 'Hỏi {name} về âm thanh trong khu phố.',
      },
      returning: {
        en: 'Catch up with {name} about the neighborhood soundscape.',
        vi: 'Trò chuyện tiếp với {name} về âm thanh quanh khu phố.',
      },
    },
    text: {
      en: '{name} is listening to the sounds around the neighborhood.',
      vi: '{name} đang lắng nghe âm thanh quanh khu phố.',
    },
    animation: 'idle',
  },
  busy: {
    conversationHints: {
      first: {
        en: 'Ask {name} about the rhythm they are keeping.',
        vi: 'Hỏi {name} về nhịp đang được giữ.',
      },
      returning: {
        en: 'Share a chat about rhythm with {name}.',
        vi: 'Trò chuyện với {name} về nhịp điệu.',
      },
    },
    text: {
      en: '{name} is keeping time with a gentle hand movement.',
      vi: '{name} đang nhẹ nhàng đưa tay giữ nhịp.',
    },
    animation: 'interact-left',
  },
} satisfies NpcActivities

import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    conversationHints: {
      first: {
        en: 'Ask {name} about the people around the neighborhood.',
        vi: 'Hỏi {name} về mọi người trong khu phố.',
      },
      returning: {
        en: 'Catch up with {name} about the neighbors passing by.',
        vi: 'Trò chuyện tiếp với {name} về hàng xóm qua lại.',
      },
    },
    text: {
      en: '{name} is watching neighbors pass nearby.',
      vi: '{name} đang nhìn mọi người qua lại gần đó.',
    },
    animation: 'idle',
  },
  busy: {
    conversationHints: {
      first: {
        en: 'Ask {name} about the gathering they are guiding visitors through.',
        vi: 'Hỏi {name} về chỗ sinh hoạt đang được giới thiệu cho khách.',
      },
      returning: {
        en: 'Check in with {name} about welcoming visitors.',
        vi: 'Hỏi thăm {name} về việc đón khách.',
      },
    },
    text: {
      en: '{name} is guiding visitors through the gathering.',
      vi: '{name} đang hướng dẫn khách quanh chỗ sinh hoạt.',
    },
    animation: 'interact-right',
  },
} satisfies NpcActivities

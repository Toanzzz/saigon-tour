import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    conversationHints: {
      first: {
        en: 'Ask {name} about getting around the neighborhood.',
        vi: 'Hỏi {name} về việc đi lại trong khu phố.',
      },
      returning: {
        en: 'Catch up with {name} about the streets nearby.',
        vi: 'Trò chuyện tiếp với {name} về những con đường gần đây.',
      },
    },
    text: {
      en: '{name} is watching the passing traffic.',
      vi: '{name} đang nhìn dòng xe qua lại.',
    },
    animation: 'idle',
  },
  busy: {
    conversationHints: {
      first: {
        en: 'Ask {name} about the route they are pointing out.',
        vi: 'Hỏi {name} về con đường đang được chỉ.',
      },
      returning: {
        en: 'Compare neighborhood routes with {name}.',
        vi: 'Trò chuyện với {name} về những lối đi quanh khu phố.',
      },
    },
    text: {
      en: '{name} is pointing out a neighborhood route.',
      vi: '{name} đang chỉ đường đi quanh khu phố.',
    },
    animation: 'interact-right',
  },
} satisfies NpcActivities

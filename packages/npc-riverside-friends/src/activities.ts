import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    conversationHints: {
      first: {
        en: 'Ask {name} what they like about the riverside.',
        vi: 'Hỏi {name} thích điều gì ở bờ sông.',
      },
      returning: {
        en: 'Catch up with {name} by the river.',
        vi: 'Trò chuyện tiếp với {name} bên sông.',
      },
    },
    text: {
      en: '{name} is enjoying a quiet moment by the river.',
      vi: '{name} đang tận hưởng chút yên tĩnh bên sông.',
    },
    animation: 'idle',
  },
  busy: {
    conversationHints: {
      first: {
        en: 'Ask {name} what they are pointing out along the river.',
        vi: 'Hỏi {name} đang chỉ điều gì dọc bờ sông.',
      },
      returning: {
        en: 'See what {name} wants to show you on the riverbank.',
        vi: 'Hỏi xem {name} muốn chỉ bạn điều gì trên bờ sông.',
      },
    },
    text: {
      en: '{name} is pointing along the riverbank.',
      vi: '{name} đang chỉ dọc theo bờ sông.',
    },
    animation: 'interact-left',
  },
} satisfies NpcActivities

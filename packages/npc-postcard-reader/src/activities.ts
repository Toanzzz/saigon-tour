import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    conversationHints: {
      first: {
        en: 'Ask {name} what brings them to the Post Office.',
        vi: 'Hỏi {name} vì sao ghé Bưu điện.',
      },
      returning: {
        en: 'Catch up with {name} outside the Post Office.',
        vi: 'Trò chuyện tiếp với {name} bên ngoài Bưu điện.',
      },
    },
    text: {
      en: '{name} is holding both hands together outside the Post Office.',
      vi: '{name} đang chụm hai tay bên ngoài Bưu điện.',
    },
    animation: 'holding-both',
  },
  busy: {
    conversationHints: {
      first: {
        en: 'Ask {name} about the Post Office entrance.',
        vi: 'Hỏi {name} về lối vào Bưu điện.',
      },
      returning: {
        en: 'See what {name} has noticed by the Post Office doors.',
        vi: 'Hỏi xem {name} để ý điều gì bên cửa Bưu điện.',
      },
    },
    text: {
      en: '{name} is looking toward the Post Office doors.',
      vi: '{name} đang nhìn về phía cửa Bưu điện.',
    },
    animation: 'idle',
  },
} satisfies NpcActivities

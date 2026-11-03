import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    conversationHints: {
      first: {
        en: 'Ask {name} how they like their coffee.',
        vi: 'Hỏi {name} thích uống cà phê thế nào.',
      },
      returning: {
        en: 'Catch up with {name} over coffee.',
        vi: 'Trò chuyện tiếp với {name} bên ly cà phê.',
      },
    },
    text: {
      en: '{name} is holding a coffee by the café.',
      vi: '{name} đang cầm cà phê bên quán.',
    },
    animation: 'holding-right',
    prop: 'food/cup-coffee',
  },
  busy: {
    conversationHints: {
      first: {
        en: 'Ask {name} how their break is going.',
        vi: 'Hỏi {name} đang nghỉ ngơi thế nào.',
      },
      returning: {
        en: 'Share a quiet moment with {name}.',
        vi: 'Dành chút thời gian yên tĩnh trò chuyện với {name}.',
      },
    },
    text: {
      en: '{name} is taking a quiet break outside the café.',
      vi: '{name} đang nghỉ một lát yên tĩnh bên quán.',
    },
    animation: 'idle',
  },
} satisfies NpcActivities

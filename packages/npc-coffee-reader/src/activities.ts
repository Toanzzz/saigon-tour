import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    conversationHints: {
      first: {
        en: 'Ask {name} whether they feel like a quiet chat.',
        vi: 'Hỏi {name} có muốn trò chuyện một lát không.',
      },
      returning: {
        en: 'Check in with {name} at the café.',
        vi: 'Ghé hỏi thăm {name} bên quán cà phê.',
      },
    },
    text: {
      en: '{name} is sitting quietly outside the café.',
      vi: '{name} đang ngồi yên bên quán cà phê.',
    },
    animation: 'sit',
  },
  busy: {
    conversationHints: {
      first: {
        en: 'Ask {name} what they enjoy about this café.',
        vi: 'Hỏi {name} thích điều gì ở quán cà phê này.',
      },
      returning: {
        en: 'Catch up with {name} about the café crowd.',
        vi: 'Trò chuyện tiếp với {name} về khách qua lại ở quán.',
      },
    },
    text: {
      en: '{name} is watching the café crowd from a seat.',
      vi: '{name} đang ngồi ngắm khách qua lại bên quán cà phê.',
    },
    animation: 'sit',
  },
} satisfies NpcActivities

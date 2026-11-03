import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    conversationHints: {
      first: {
        en: 'Ask {name} what brings them to the square.',
        vi: 'Hỏi {name} vì sao ghé quảng trường.',
      },
      returning: {
        en: 'Catch up with {name} around the square.',
        vi: 'Trò chuyện tiếp với {name} bên quảng trường.',
      },
    },
    text: {
      en: '{name} is watching the square with a relaxed air.',
      vi: '{name} đang thong thả ngắm quảng trường.',
    },
    animation: 'idle',
  },
  busy: {
    conversationHints: {
      first: {
        en: 'Ask {name} what is drawing their attention in the square.',
        vi: 'Hỏi {name} điều gì ở quảng trường đang khiến họ chú ý.',
      },
      returning: {
        en: 'See what {name} has noticed in the lively square.',
        vi: 'Hỏi xem {name} để ý điều gì ở quảng trường nhộn nhịp.',
      },
    },
    text: {
      en: '{name} is gesturing toward the lively square.',
      vi: '{name} đang chỉ về phía quảng trường nhộn nhịp.',
    },
    animation: 'interact-left',
  },
} satisfies NpcActivities

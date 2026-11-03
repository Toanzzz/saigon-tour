import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    conversationHints: {
      first: {
        en: 'Ask {name} how their break is going.',
        vi: 'Hỏi {name} đang nghỉ ngơi thế nào.',
      },
      returning: {
        en: 'Catch up with {name} during the break.',
        vi: 'Trò chuyện tiếp với {name} trong giờ nghỉ.',
      },
    },
    text: {
      en: '{name} is taking a break near the square.',
      vi: '{name} đang nghỉ chân gần quảng trường.',
    },
    animation: 'idle',
  },
  busy: {
    conversationHints: {
      first: {
        en: 'Ask {name} what is across the square.',
        vi: 'Hỏi {name} bên kia quảng trường có gì.',
      },
      returning: {
        en: 'See what {name} has noticed across the square.',
        vi: 'Hỏi xem {name} để ý điều gì bên kia quảng trường.',
      },
    },
    text: {
      en: '{name} is pointing across the square.',
      vi: '{name} đang chỉ về phía bên kia quảng trường.',
    },
    animation: 'interact-right',
  },
} satisfies NpcActivities

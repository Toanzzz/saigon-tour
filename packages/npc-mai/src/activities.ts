import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    conversationHints: {
      first: {
        en: 'Ask {name} about their favorite coffee break.',
        vi: 'Hỏi {name} thích nghỉ uống cà phê thế nào.',
      },
      returning: {
        en: 'Catch up with {name} over a coffee break.',
        vi: 'Trò chuyện tiếp với {name} trong lúc nghỉ cà phê.',
      },
    },
    text: {
      en: '{name} is holding a coffee during a quiet moment.',
      vi: '{name} đang cầm ly cà phê trong một lúc nghỉ.',
    },
    animation: 'holding-right',
    prop: 'food/cup-coffee',
  },
  busy: {
    conversationHints: {
      first: {
        en: 'Ask {name} who is nearby.',
        vi: 'Hỏi {name} quanh đây có những ai.',
      },
      returning: {
        en: 'Catch up with {name} about the neighbors nearby.',
        vi: 'Trò chuyện tiếp với {name} về hàng xóm quanh đây.',
      },
    },
    text: {
      en: '{name} is gesturing toward nearby neighbors.',
      vi: '{name} đang đưa tay chỉ về phía hàng xóm.',
    },
    animation: 'interact-right',
  },
} satisfies NpcActivities

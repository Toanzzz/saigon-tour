import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    conversationHints: {
      first: {
        en: 'Ask {name} about their route through the market.',
        vi: 'Hỏi {name} về lối đi quen trong chợ.',
      },
      returning: {
        en: 'Catch up with {name} on the market walk.',
        vi: 'Trò chuyện tiếp với {name} trên đường dạo chợ.',
      },
    },
    text: {
      en: '{name} is walking a familiar route through the market.',
      vi: '{name} đang đi trên lối quen trong chợ.',
    },
    animation: 'walk',
    movement: 'walk',
  },
  busy: {
    conversationHints: {
      first: {
        en: 'Ask {name} about a good place to pause in the market.',
        vi: 'Hỏi {name} trong chợ có chỗ nào nghỉ chân.',
      },
      returning: {
        en: 'Share a market-side chat with {name}.',
        vi: 'Dừng chân trò chuyện với {name} bên lối chợ.',
      },
    },
    text: {
      en: '{name} is pausing beside the market path.',
      vi: '{name} đang dừng chân bên lối đi trong chợ.',
    },
    animation: 'idle',
  },
} satisfies NpcActivities

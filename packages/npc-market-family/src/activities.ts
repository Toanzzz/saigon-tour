import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    conversationHints: {
      first: {
        en: 'Ask {name} what they enjoy about the market.',
        vi: 'Hỏi {name} thích điều gì ở chợ.',
      },
      returning: {
        en: 'Catch up with {name} about the market bustle.',
        vi: 'Trò chuyện tiếp với {name} về cảnh nhộn nhịp ở chợ.',
      },
    },
    text: {
      en: '{name} is watching the bustle of the market.',
      vi: '{name} đang ngắm cảnh nhộn nhịp trong chợ.',
    },
    animation: 'idle',
  },
  busy: {
    conversationHints: {
      first: {
        en: 'Ask {name} about the nearby stall.',
        vi: 'Hỏi {name} về sạp hàng gần đó.',
      },
      returning: {
        en: 'See which stall {name} wants to show you.',
        vi: 'Hỏi xem {name} muốn chỉ bạn sạp hàng nào.',
      },
    },
    text: {
      en: '{name} is gesturing toward a nearby stall.',
      vi: '{name} đang chỉ về một sạp hàng gần đó.',
    },
    animation: 'interact-right',
  },
} satisfies NpcActivities

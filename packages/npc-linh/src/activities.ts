import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    conversationHints: {
      first: {
        en: 'Ask {name} about this neighborhood gathering place.',
        vi: 'Hỏi {name} về chỗ sinh hoạt của khu phố.',
      },
      returning: {
        en: 'Catch up with {name} about the neighbors.',
        vi: 'Trò chuyện tiếp với {name} về hàng xóm.',
      },
    },
    text: {
      en: '{name} is looking over the nearby gathering place.',
      vi: '{name} đang trông coi chỗ sinh hoạt gần đó.',
    },
    animation: 'idle',
  },
  busy: {
    conversationHints: {
      first: {
        en: 'Ask {name} where everyone is gathering.',
        vi: 'Hỏi {name} mọi người đang tụ họp ở đâu.',
      },
      returning: {
        en: 'Check in with {name} about the gathering.',
        vi: 'Hỏi thăm {name} về buổi tụ họp.',
      },
    },
    text: {
      en: '{name} is guiding neighbors toward the gathering.',
      vi: '{name} đang hướng dẫn mọi người đến chỗ sinh hoạt.',
    },
    animation: 'interact-right',
  },
} satisfies NpcActivities

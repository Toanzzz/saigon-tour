import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    conversationHints: {
      first: {
        en: 'Ask {name} what caught their eye nearby.',
        vi: 'Hỏi {name} xem quanh đây có gì khiến họ chú ý.',
      },
      returning: {
        en: 'Catch up with {name} about the sights nearby.',
        vi: 'Trò chuyện tiếp với {name} về cảnh vật quanh đây.',
      },
    },
    text: {
      en: '{name} is taking in the surroundings.',
      vi: '{name} đang ngắm quang cảnh xung quanh.',
    },
    animation: 'idle',
  },
  busy: {
    conversationHints: {
      first: {
        en: 'Ask {name} about the detail they are pointing out.',
        vi: 'Hỏi {name} về chi tiết họ đang chỉ.',
      },
      returning: {
        en: 'See what else {name} has noticed nearby.',
        vi: 'Hỏi xem {name} còn để ý điều gì thú vị quanh đây.',
      },
    },
    text: {
      en: '{name} is pointing out details in the surroundings.',
      vi: '{name} đang chỉ những chi tiết xung quanh.',
    },
    animation: 'interact-left',
  },
} satisfies NpcActivities

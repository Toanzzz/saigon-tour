import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    conversationHints: {
      first: {
        en: 'Ask {name} what they think of the Opera House.',
        vi: 'Hỏi {name} cảm nhận thế nào về Nhà hát.',
      },
      returning: {
        en: 'Catch up with {name} about the Opera House.',
        vi: 'Trò chuyện tiếp với {name} về Nhà hát.',
      },
    },
    text: {
      en: '{name} is looking toward the Opera House.',
      vi: '{name} đang nhìn về phía Nhà hát.',
    },
    animation: 'idle',
  },
  busy: {
    conversationHints: {
      first: {
        en: 'Ask {name} about the detail on the Opera House.',
        vi: 'Hỏi {name} về chi tiết trên Nhà hát.',
      },
      returning: {
        en: 'See what else {name} has spotted on the building.',
        vi: 'Hỏi xem {name} còn để ý chi tiết nào trên tòa nhà.',
      },
    },
    text: {
      en: '{name} is pointing out a detail on the Opera House.',
      vi: '{name} đang chỉ một chi tiết trên Nhà hát.',
    },
    animation: 'interact-right',
  },
} satisfies NpcActivities

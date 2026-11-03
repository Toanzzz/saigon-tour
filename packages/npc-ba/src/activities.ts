import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    conversationHints: {
      first: {
        en: 'Ask {name} what they enjoy about the neighborhood.',
        vi: 'Hỏi {name} thích điều gì ở khu phố.',
      },
      returning: {
        en: 'Catch up with {name} about life in the neighborhood.',
        vi: 'Hỏi thăm {name} về cuộc sống trong khu phố.',
      },
    },
    text: {
      en: '{name} is watching the neighborhood go by.',
      vi: '{name} đang ngắm nhịp sống khu phố.',
    },
    animation: 'idle',
  },
  busy: {
    conversationHints: {
      first: {
        en: 'Ask {name} what they are pointing toward.',
        vi: 'Hỏi {name} đang chỉ về điều gì.',
      },
      returning: {
        en: 'See what {name} wants to show you nearby.',
        vi: 'Hỏi xem {name} muốn chỉ bạn điều gì gần đây.',
      },
    },
    text: {
      en: '{name} is gesturing toward something nearby.',
      vi: '{name} đang chỉ về phía gần đó.',
    },
    animation: 'interact-left',
  },
} satisfies NpcActivities

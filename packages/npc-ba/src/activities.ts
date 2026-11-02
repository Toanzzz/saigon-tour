import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    text: {
      en: '{name} is watching the neighborhood go by.',
      vi: '{name} đang ngắm nhịp sống khu phố.',
    },
    animation: 'idle',
  },
  busy: {
    text: {
      en: '{name} is gesturing toward something nearby.',
      vi: '{name} đang chỉ về phía gần đó.',
    },
    animation: 'interact-left',
  },
} satisfies NpcActivities

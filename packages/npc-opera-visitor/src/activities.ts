import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    text: {
      en: '{name} is looking toward the Opera House.',
      vi: '{name} đang nhìn về phía Nhà hát.',
    },
    animation: 'idle',
  },
  busy: {
    text: {
      en: '{name} is pointing out a detail on the Opera House.',
      vi: '{name} đang chỉ một chi tiết trên Nhà hát.',
    },
    animation: 'interact-right',
  },
} satisfies NpcActivities

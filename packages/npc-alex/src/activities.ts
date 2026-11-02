import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    text: {
      en: '{name} is taking in the surroundings.',
      vi: '{name} đang ngắm quang cảnh xung quanh.',
    },
    animation: 'idle',
  },
  busy: {
    text: {
      en: '{name} is pointing out details in the surroundings.',
      vi: '{name} đang chỉ những chi tiết xung quanh.',
    },
    animation: 'interact-left',
  },
} satisfies NpcActivities

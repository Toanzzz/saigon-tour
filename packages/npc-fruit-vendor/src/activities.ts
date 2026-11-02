import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    text: {
      en: '{name} is arranging the fruit stall.',
      vi: '{name} đang sắp xếp quầy trái cây.',
    },
    animation: 'interact-left',
  },
  busy: {
    text: {
      en: '{name} is watching for the next customer.',
      vi: '{name} đang chờ vị khách tiếp theo.',
    },
    animation: 'idle',
  },
} satisfies NpcActivities

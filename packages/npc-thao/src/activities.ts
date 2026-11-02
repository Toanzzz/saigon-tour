import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    text: {
      en: '{name} is listening to the sounds around the neighborhood.',
      vi: '{name} đang lắng nghe âm thanh quanh khu phố.',
    },
    animation: 'idle',
  },
  busy: {
    text: {
      en: '{name} is keeping time with a gentle hand movement.',
      vi: '{name} đang nhẹ nhàng đưa tay giữ nhịp.',
    },
    animation: 'interact-left',
  },
} satisfies NpcActivities

import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    text: {
      en: '{name} is browsing the market stalls.',
      vi: '{name} đang ngắm các sạp hàng trong chợ.',
    },
    animation: 'idle',
  },
  busy: {
    text: {
      en: '{name} is pointing toward an interesting stall.',
      vi: '{name} đang chỉ về một sạp hàng vừa để ý.',
    },
    animation: 'interact-right',
  },
} satisfies NpcActivities

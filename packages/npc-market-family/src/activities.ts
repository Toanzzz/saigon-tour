import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    text: {
      en: '{name} is watching the bustle of the market.',
      vi: '{name} đang ngắm cảnh nhộn nhịp trong chợ.',
    },
    animation: 'idle',
  },
  busy: {
    text: {
      en: '{name} is gesturing toward a nearby stall.',
      vi: '{name} đang chỉ về một sạp hàng gần đó.',
    },
    animation: 'interact-right',
  },
} satisfies NpcActivities

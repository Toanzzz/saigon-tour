import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    text: {
      en: '{name} is walking a familiar route through the market.',
      vi: '{name} đang đi trên lối quen trong chợ.',
    },
    animation: 'walk',
    movement: 'walk',
  },
  busy: {
    text: {
      en: '{name} is pausing beside the market path.',
      vi: '{name} đang dừng chân bên lối đi trong chợ.',
    },
    animation: 'idle',
  },
} satisfies NpcActivities

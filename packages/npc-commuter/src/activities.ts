import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    text: {
      en: '{name} is walking along a familiar street.',
      vi: '{name} đang đi trên con đường quen thuộc.',
    },
    animation: 'walk',
    movement: 'walk',
  },
  busy: {
    text: {
      en: '{name} is pausing beside the street.',
      vi: '{name} đang dừng chân bên đường.',
    },
    animation: 'idle',
  },
} satisfies NpcActivities

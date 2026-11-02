import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    text: {
      en: '{name} is wandering slowly around the square.',
      vi: '{name} đang thong thả đi quanh quảng trường.',
    },
    animation: 'walk',
    movement: 'walk',
  },
  busy: {
    text: {
      en: '{name} is stopping to admire the square.',
      vi: '{name} đang dừng lại ngắm quảng trường.',
    },
    animation: 'idle',
  },
} satisfies NpcActivities

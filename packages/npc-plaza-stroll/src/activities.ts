import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    text: {
      en: '{name} is strolling through the square.',
      vi: '{name} đang dạo bước qua quảng trường.',
    },
    animation: 'walk',
    movement: 'walk',
  },
  busy: {
    text: {
      en: '{name} is pausing to take in the square.',
      vi: '{name} đang dừng lại ngắm quảng trường.',
    },
    animation: 'idle',
  },
} satisfies NpcActivities

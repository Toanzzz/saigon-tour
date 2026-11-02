import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    text: {
      en: '{name} is taking a break near the square.',
      vi: '{name} đang nghỉ chân gần quảng trường.',
    },
    animation: 'idle',
  },
  busy: {
    text: {
      en: '{name} is pointing across the square.',
      vi: '{name} đang chỉ về phía bên kia quảng trường.',
    },
    animation: 'interact-right',
  },
} satisfies NpcActivities

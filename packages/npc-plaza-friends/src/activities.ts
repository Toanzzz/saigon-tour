import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    text: {
      en: '{name} is watching the square with a relaxed air.',
      vi: '{name} đang thong thả ngắm quảng trường.',
    },
    animation: 'idle',
  },
  busy: {
    text: {
      en: '{name} is gesturing toward the lively square.',
      vi: '{name} đang chỉ về phía quảng trường nhộn nhịp.',
    },
    animation: 'interact-left',
  },
} satisfies NpcActivities

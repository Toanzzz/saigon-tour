import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    text: {
      en: '{name} is enjoying a quiet moment by the river.',
      vi: '{name} đang tận hưởng chút yên tĩnh bên sông.',
    },
    animation: 'idle',
  },
  busy: {
    text: {
      en: '{name} is pointing along the riverbank.',
      vi: '{name} đang chỉ dọc theo bờ sông.',
    },
    animation: 'interact-left',
  },
} satisfies NpcActivities

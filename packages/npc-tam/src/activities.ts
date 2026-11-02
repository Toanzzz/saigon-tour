import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    text: {
      en: '{name} is watching the passing traffic.',
      vi: '{name} đang nhìn dòng xe qua lại.',
    },
    animation: 'idle',
  },
  busy: {
    text: {
      en: '{name} is pointing out a neighborhood route.',
      vi: '{name} đang chỉ đường đi quanh khu phố.',
    },
    animation: 'interact-right',
  },
} satisfies NpcActivities

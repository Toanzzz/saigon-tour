import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    text: {
      en: '{name} is keeping an easy pace along the riverside.',
      vi: '{name} đang bước đều thong thả dọc bờ sông.',
    },
    animation: 'walk',
    movement: 'walk',
  },
  busy: {
    text: {
      en: '{name} is catching a breath beside the river.',
      vi: '{name} đang nghỉ lấy sức bên sông.',
    },
    animation: 'idle',
  },
} satisfies NpcActivities

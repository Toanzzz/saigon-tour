import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    text: {
      en: '{name} is holding both hands together outside the Post Office.',
      vi: '{name} đang chụm hai tay bên ngoài Bưu điện.',
    },
    animation: 'holding-both',
  },
  busy: {
    text: {
      en: '{name} is looking toward the Post Office doors.',
      vi: '{name} đang nhìn về phía cửa Bưu điện.',
    },
    animation: 'idle',
  },
} satisfies NpcActivities

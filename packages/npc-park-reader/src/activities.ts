import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    text: {
      en: '{name} is sitting in a quiet corner of the park.',
      vi: '{name} đang ngồi ở một góc yên tĩnh trong công viên.',
    },
    animation: 'sit',
  },
  busy: {
    text: {
      en: '{name} is watching the park from a seat.',
      vi: '{name} đang ngồi ngắm công viên.',
    },
    animation: 'sit',
  },
} satisfies NpcActivities

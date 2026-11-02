import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    text: {
      en: '{name} is looking over the nearby gathering place.',
      vi: '{name} đang trông coi chỗ sinh hoạt gần đó.',
    },
    animation: 'idle',
  },
  busy: {
    text: {
      en: '{name} is guiding neighbors toward the gathering.',
      vi: '{name} đang hướng dẫn mọi người đến chỗ sinh hoạt.',
    },
    animation: 'interact-right',
  },
} satisfies NpcActivities

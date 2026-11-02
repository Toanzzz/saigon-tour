import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    text: {
      en: '{name} is watching neighbors pass nearby.',
      vi: '{name} đang nhìn mọi người qua lại gần đó.',
    },
    animation: 'idle',
  },
  busy: {
    text: {
      en: '{name} is guiding visitors through the gathering.',
      vi: '{name} đang hướng dẫn khách quanh chỗ sinh hoạt.',
    },
    animation: 'interact-right',
  },
} satisfies NpcActivities

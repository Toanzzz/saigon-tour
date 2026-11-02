import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    text: {
      en: '{name} is looking over the nearby buildings.',
      vi: '{name} đang nhìn quanh các tòa nhà gần đó.',
    },
    animation: 'idle',
  },
  busy: {
    text: {
      en: '{name} is explaining something with a small gesture.',
      vi: '{name} đang khẽ đưa tay giải thích điều gì đó.',
    },
    animation: 'interact-right',
  },
} satisfies NpcActivities

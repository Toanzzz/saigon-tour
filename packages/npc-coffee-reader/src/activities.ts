import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    text: {
      en: '{name} is sitting quietly outside the café.',
      vi: '{name} đang ngồi yên bên quán cà phê.',
    },
    animation: 'sit',
  },
  busy: {
    text: {
      en: '{name} is watching the café crowd from a seat.',
      vi: '{name} đang ngồi ngắm khách qua lại bên quán cà phê.',
    },
    animation: 'sit',
  },
} satisfies NpcActivities

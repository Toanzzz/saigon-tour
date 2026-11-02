import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    text: {
      en: '{name} is holding a coffee by the café.',
      vi: '{name} đang cầm cà phê bên quán.',
    },
    animation: 'holding-right',
    prop: 'food/cup-coffee',
  },
  busy: {
    text: {
      en: '{name} is taking a quiet break outside the café.',
      vi: '{name} đang nghỉ một lát yên tĩnh bên quán.',
    },
    animation: 'idle',
  },
} satisfies NpcActivities

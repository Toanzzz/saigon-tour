import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    text: {
      en: '{name} is holding a coffee during a quiet moment.',
      vi: '{name} đang cầm ly cà phê trong một lúc nghỉ.',
    },
    animation: 'holding-right',
    prop: 'food/cup-coffee',
  },
  busy: {
    text: {
      en: '{name} is gesturing toward nearby neighbors.',
      vi: '{name} đang đưa tay chỉ về phía hàng xóm.',
    },
    animation: 'interact-right',
  },
} satisfies NpcActivities

import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    text: {
      en: '{name} is arranging bowls for nearby neighbors.',
      vi: '{name} đang xếp bát cho hàng xóm.',
    },
    animation: 'interact-right',
  },
  busy: {
    text: {
      en: '{name} is holding a warm bowl, checking the next order.',
      vi: '{name} đang bưng bát nóng, xem đơn tiếp theo.',
    },
    animation: 'holding-both',
    prop: 'food/bowl-soup',
  },
} satisfies NpcActivities

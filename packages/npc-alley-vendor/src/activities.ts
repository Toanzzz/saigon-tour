import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    text: {
      en: '{name} is tending the food stall in the alley.',
      vi: '{name} đang chăm nom quầy đồ ăn trong hẻm.',
    },
    animation: 'interact-right',
  },
  busy: {
    text: {
      en: '{name} is holding a bowl for the next customer.',
      vi: '{name} đang bưng bát cho vị khách tiếp theo.',
    },
    animation: 'holding-both',
    prop: 'food/bowl-soup',
  },
} satisfies NpcActivities

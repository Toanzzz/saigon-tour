import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    text: {
      en: '{name} is tending the bread stall.',
      vi: '{name} đang chăm nom quầy bánh mì.',
    },
    animation: 'interact-right',
  },
  busy: {
    text: {
      en: '{name} is holding a loaf for the next customer.',
      vi: '{name} đang cầm ổ bánh cho vị khách tiếp theo.',
    },
    animation: 'holding-both',
    prop: 'food/loaf-baguette',
  },
} satisfies NpcActivities

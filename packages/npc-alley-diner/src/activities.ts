import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    text: {
      en: '{name} is sitting beside the alley food stalls.',
      vi: '{name} đang ngồi bên các quầy đồ ăn trong hẻm.',
    },
    animation: 'sit',
  },
  busy: {
    text: {
      en: '{name} is watching the bustle of the food alley from a seat.',
      vi: '{name} đang ngồi ngắm cảnh nhộn nhịp trong hẻm đồ ăn.',
    },
    animation: 'sit',
  },
} satisfies NpcActivities

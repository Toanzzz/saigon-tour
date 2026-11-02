import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    text: {
      en: '{name} is loosening up with small movements in the park.',
      vi: '{name} đang khởi động nhẹ nhàng trong công viên.',
    },
    animation: 'emote-yes',
  },
  busy: {
    text: {
      en: '{name} is resting between stretches.',
      vi: '{name} đang nghỉ giữa những động tác giãn cơ.',
    },
    animation: 'idle',
  },
} satisfies NpcActivities

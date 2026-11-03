import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    conversationHints: {
      first: {
        en: 'Ask {name} what makes a good bánh mì.',
        vi: 'Hỏi {name} điều gì làm nên một ổ bánh mì ngon.',
      },
      returning: {
        en: 'Talk bánh mì with {name} again.',
        vi: 'Trò chuyện tiếp với {name} về bánh mì.',
      },
    },
    text: {
      en: '{name} is tending the bread stall.',
      vi: '{name} đang chăm nom quầy bánh mì.',
    },
    animation: 'interact-right',
  },
  busy: {
    conversationHints: {
      first: {
        en: 'Ask {name} about the bread they are serving.',
        vi: 'Hỏi {name} về ổ bánh đang được chuẩn bị.',
      },
      returning: {
        en: 'Check in with {name} between customers.',
        vi: 'Hỏi thăm {name} lúc vắng khách.',
      },
    },
    text: {
      en: '{name} is holding a loaf for the next customer.',
      vi: '{name} đang cầm ổ bánh cho vị khách tiếp theo.',
    },
    animation: 'holding-both',
    prop: 'food/loaf-baguette',
  },
} satisfies NpcActivities

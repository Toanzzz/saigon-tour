import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    conversationHints: {
      first: {
        en: 'Ask {name} how their park routine is going.',
        vi: 'Hỏi {name} hôm nay tập luyện trong công viên thế nào.',
      },
      returning: {
        en: 'Catch up with {name} about exercising in the park.',
        vi: 'Trò chuyện tiếp với {name} về việc tập luyện trong công viên.',
      },
    },
    text: {
      en: '{name} is loosening up with small movements in the park.',
      vi: '{name} đang khởi động nhẹ nhàng trong công viên.',
    },
    animation: 'emote-yes',
  },
  busy: {
    conversationHints: {
      first: {
        en: 'Check whether {name} feels like chatting during the break.',
        vi: 'Hỏi {name} có muốn trò chuyện lúc nghỉ không.',
      },
      returning: {
        en: 'Check in with {name} between stretches.',
        vi: 'Hỏi thăm {name} giữa các động tác giãn cơ.',
      },
    },
    text: {
      en: '{name} is resting between stretches.',
      vi: '{name} đang nghỉ giữa những động tác giãn cơ.',
    },
    animation: 'idle',
  },
} satisfies NpcActivities

import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    conversationHints: {
      first: {
        en: 'Ask {name} whether they feel like chatting in the park.',
        vi: 'Hỏi {name} có muốn trò chuyện trong công viên không.',
      },
      returning: {
        en: 'Check in with {name} in the quiet corner.',
        vi: 'Ghé hỏi thăm {name} ở góc yên tĩnh.',
      },
    },
    text: {
      en: '{name} is sitting in a quiet corner of the park.',
      vi: '{name} đang ngồi ở một góc yên tĩnh trong công viên.',
    },
    animation: 'sit',
  },
  busy: {
    conversationHints: {
      first: {
        en: 'Ask {name} what they enjoy watching in the park.',
        vi: 'Hỏi {name} thích ngắm điều gì trong công viên.',
      },
      returning: {
        en: 'Catch up with {name} about the park.',
        vi: 'Trò chuyện tiếp với {name} về công viên.',
      },
    },
    text: {
      en: '{name} is watching the park from a seat.',
      vi: '{name} đang ngồi ngắm công viên.',
    },
    animation: 'sit',
  },
} satisfies NpcActivities

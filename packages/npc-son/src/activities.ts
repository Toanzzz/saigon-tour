import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    conversationHints: {
      first: {
        en: 'Ask {name} about the buildings nearby.',
        vi: 'Hỏi {name} về các tòa nhà gần đó.',
      },
      returning: {
        en: 'Catch up with {name} about the neighborhood buildings.',
        vi: 'Trò chuyện tiếp với {name} về những tòa nhà trong khu phố.',
      },
    },
    text: {
      en: '{name} is looking over the nearby buildings.',
      vi: '{name} đang nhìn quanh các tòa nhà gần đó.',
    },
    animation: 'idle',
  },
  busy: {
    conversationHints: {
      first: {
        en: 'Ask {name} what they are explaining.',
        vi: 'Hỏi {name} đang giải thích điều gì.',
      },
      returning: {
        en: 'Pick up the conversation with {name} about this place.',
        vi: 'Tiếp tục trò chuyện với {name} về nơi này.',
      },
    },
    text: {
      en: '{name} is explaining something with a small gesture.',
      vi: '{name} đang khẽ đưa tay giải thích điều gì đó.',
    },
    animation: 'interact-right',
  },
} satisfies NpcActivities

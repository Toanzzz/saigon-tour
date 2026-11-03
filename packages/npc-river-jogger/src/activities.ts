import type { NpcActivities } from '@saigon/npc-kit'

export const activities = {
  default: {
    conversationHints: {
      first: {
        en: 'Ask {name} about their riverside route.',
        vi: 'Hỏi {name} về lộ trình dọc bờ sông.',
      },
      returning: {
        en: 'Catch up with {name} about the riverside walk.',
        vi: 'Trò chuyện tiếp với {name} về đường dạo ven sông.',
      },
    },
    text: {
      en: '{name} is keeping an easy pace along the riverside.',
      vi: '{name} đang bước đều thong thả dọc bờ sông.',
    },
    animation: 'walk',
    movement: 'walk',
  },
  busy: {
    conversationHints: {
      first: {
        en: 'Check whether {name} feels like chatting while resting.',
        vi: 'Hỏi {name} có muốn trò chuyện trong lúc nghỉ không.',
      },
      returning: {
        en: 'Check in with {name} during the riverside break.',
        vi: 'Hỏi thăm {name} trong lúc nghỉ bên sông.',
      },
    },
    text: {
      en: '{name} is catching a breath beside the river.',
      vi: '{name} đang nghỉ lấy sức bên sông.',
    },
    animation: 'idle',
  },
} satisfies NpcActivities

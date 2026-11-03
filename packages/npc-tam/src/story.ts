import type { NpcStory } from '@saigon/npc-kit'
import { arc } from './seeds/arc'
import { gag } from './seeds/gag'

export const story: NpcStory = {
  completion: {
    en: 'Thanks for lending a hand! You made the neighborhood a little easier to get around. Give me a wave next time.',
    vi: 'Cảm ơn em đã giúp một tay nha! Có em, chuyện trong xóm nhẹ hẳn. Bữa nào gặp thì vẫy anh một cái nhé.',
  },
  seeds: [
    arc,
    gag,
    {
      payoff: {
        en: 'Thanks for checking on Ông Ba by the river! A hello from a neighbor is a good reason to slow down, even for me.',
        vi: 'Cảm ơn em ghé hỏi thăm ông Ba bên sông nha! Một tiếng chào hàng xóm cũng đáng chạy chậm lại, kể cả với anh.',
      },
      scope: 'solo',
      steps: [{ type: 'TALK_TO', npcId: 'ba' }],
      text: {
        en: {
          title: 'A riverside hello',
          description: 'Check on Mr. Ba by the river and say hello.',
        },
        vi: {
          title: 'Lời chào bên sông',
          description: 'Ghé thăm ông Ba bên sông và chào ông một tiếng.',
        },
      },
    },
  ],
  domain: {
    home: 'market',
    locations: ['market', 'park', 'river', 'cityhall'],
    npcs: ['hoa', 'linh', 'ba', 'mai'],
    items: ['coffee', 'banana', 'postcard', 'cake'],
    gifts: ['coffee', 'postcard'],
  },
}

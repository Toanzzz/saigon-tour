import type { NpcStory } from '@saigon/npc-kit'
import { gag } from './seeds/gag'
import { riddle } from './seeds/riddle'

export const story: NpcStory = {
  completion: {
    en: 'Thank you, bạn. Thoughtful, well timed, and quietly generous. A performance I would gladly recommend.',
    vi: 'Cảm ơn bạn nha. Chu đáo, đúng lúc, lại hào phóng một cách nhẹ nhàng. Một màn diễn mình sẵn lòng giới thiệu.',
  },
  seeds: [
    gag,
    {
      payoff: {
        en: 'Alex has the postcard! Thank you, bạn. A considerate delivery and no scene stolen from the neighbors: a very good review.',
        vi: 'Anh Alex nhận bưu thiếp rồi! Cảm ơn bạn nha. Giao thiệp chu đáo, lại không giành sân khấu của hàng xóm: đáng nhận xét tốt.',
      },
      scope: 'solo',
      steps: [{ type: 'DELIVER', itemId: 'postcard', npcId: 'alex' }],
      text: {
        en: {
          title: 'A note for a fellow regular',
          description: 'Bring this postcard to anh Alex at the Opera House.',
        },
        vi: {
          title: 'Lời nhắn cho người quen',
          description: 'Mang tấm bưu thiếp này đến cho anh Alex ở Nhà hát.',
        },
      },
    },
    riddle,
  ],
  domain: {
    home: 'opera',
    locations: ['opera', 'cityhall', 'cathedral'],
    npcs: ['alex', 'thao', 'vy'],
    items: ['photo', 'postcard', 'coffee', 'banana'],
    gifts: ['postcard', 'coffee'],
  },
}

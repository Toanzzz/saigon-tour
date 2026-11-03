import type { NpcStory } from '@saigon/npc-kit'
import { gag } from './seeds/gag'
import { riddle } from './seeds/riddle'

export const story: NpcStory = {
  completion: {
    en: 'Thank you, bạn. A small kindness, carried carefully, arrives somewhere in the heart.',
    vi: 'Cảm ơn bạn nha. Một chút tử tế, được mang đi cẩn thận, rồi cũng tới một góc trong lòng.',
  },
  seeds: [
    gag,
    {
      payoff: {
        en: 'Vy has the photo at City Hall. Thank you, bạn. A little square of light has found a place to stay.',
        vi: 'Chị Vy nhận ảnh ở Tòa Thị Chính rồi. Cảm ơn bạn nha. Một ô ánh sáng nhỏ đã có chỗ ở lại.',
      },
      scope: 'solo',
      steps: [{ type: 'DELIVER', itemId: 'photo', npcId: 'vy' }],
      text: {
        en: {
          title: 'A photo for City Hall',
          description: 'Bring this photo to chị Vy at City Hall.',
        },
        vi: {
          title: 'Tấm ảnh cho Tòa Thị Chính',
          description: 'Mang tấm ảnh này đến cho chị Vy ở Tòa Thị Chính.',
        },
      },
    },
    riddle,
  ],
  domain: {
    home: 'postoffice',
    locations: ['postoffice', 'cityhall', 'cathedral'],
    npcs: ['son', 'vy', 'alex'],
    items: ['postcard', 'photo', 'coffee', 'banana'],
    gifts: ['postcard', 'coffee'],
  },
}

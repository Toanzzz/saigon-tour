import type { NpcStory } from '@saigon/npc-kit'
import { gag } from './seeds/gag'
import { riddle } from './seeds/riddle'

export const story: NpcStory = {
  seeds: [
    gag,
    {
      scope: 'solo',
      steps: [{ type: 'DELIVER', itemId: 'photo', npcId: 'son' }],
      text: {
        en: {
          title: 'A photo for the post office',
          description:
            'Bring this photo to anh Sơn at the Central Post Office.',
        },
        vi: {
          title: 'Tấm ảnh cho bưu điện',
          description: 'Mang tấm ảnh này đến cho anh Sơn ở Bưu điện Trung tâm.',
        },
      },
    },
    riddle,
  ],
  domain: {
    home: 'cathedral',
    locations: ['cathedral', 'cityhall', 'opera', 'postoffice'],
    npcs: ['vy', 'alex', 'son'],
    items: ['postcard', 'photo', 'coffee', 'banana'],
    gifts: ['postcard', 'coffee'],
  },
}

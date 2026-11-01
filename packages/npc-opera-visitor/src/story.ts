import type { NpcStory } from '@saigon/npc-kit'
import { gag } from './seeds/gag'

export const story: NpcStory = {
  seeds: [
    gag,
    {
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
  ],
  domain: {
    home: 'opera',
    locations: ['opera', 'cityhall', 'cathedral'],
    npcs: ['alex', 'thao', 'vy'],
    items: ['photo', 'postcard', 'coffee', 'banana'],
    gifts: ['postcard', 'coffee'],
  },
}

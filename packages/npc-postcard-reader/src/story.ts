import type { NpcStory } from '@saigon/npc-kit'
import { gag } from './seeds/gag'
import { riddle } from './seeds/riddle'

export const story: NpcStory = {
  seeds: [
    gag,
    {
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

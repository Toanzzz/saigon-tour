import type { NpcStory } from '@saigon/npc-kit'
import { gag } from './seeds/gag'

export const story: NpcStory = {
  seeds: [
    gag,
    {
      scope: 'solo',
      steps: [
        { type: 'GO_TO', locationId: 'market' },
        { type: 'TALK_TO', npcId: 'hoa' },
      ],
      text: {
        en: {
          title: 'A community lunch invitation',
          description:
            'Visit the market and invite Ms. Hoa to our neighborhood lunch.',
        },
        vi: {
          title: 'Lời mời ăn trưa của xóm',
          description: 'Ghé chợ và mời cô Hoa đến bữa trưa chung của xóm.',
        },
      },
    },
  ],
  domain: {
    home: 'park',
    locations: ['park', 'market', 'cathedral', 'cityhall'],
    npcs: ['hoa', 'tam', 'mai', 'vy', 'thao'],
    items: ['herbs', 'noodles', 'broth', 'baguette', 'banana', 'postcard'],
    gifts: ['postcard', 'banana'],
  },
}

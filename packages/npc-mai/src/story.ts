import type { NpcStory } from '@saigon/npc-kit'
import { gag } from './seeds/gag'

export const story: NpcStory = {
  seeds: [
    gag,
    {
      scope: 'solo',
      steps: [{ type: 'DELIVER', itemId: 'coffee', npcId: 'hoa' }],
      text: {
        en: {
          title: 'Coffee for Ms. Hoa',
          description: 'Take this coffee across the market to Ms. Hoa.',
        },
        vi: {
          title: 'Cà phê cho cô Hoa',
          description: 'Mang ly cà phê này qua chợ cho cô Hoa.',
        },
      },
    },
  ],
  domain: {
    home: 'market',
    locations: ['market', 'alley', 'park', 'postoffice'],
    npcs: ['hoa', 'tam', 'linh', 'son'],
    items: ['coffee', 'banana', 'baguette', 'postcard'],
    gifts: ['coffee', 'banana'],
  },
}

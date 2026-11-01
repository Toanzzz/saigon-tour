import type { NpcStory } from '@saigon/npc-kit'
import { gag } from './seeds/gag'

export const story: NpcStory = {
  seeds: [
    gag,
    {
      scope: 'solo',
      steps: [{ type: 'DELIVER', itemId: 'herbs', npcId: 'hoa' }],
      text: {
        en: {
          title: 'Herbs for the pho stall',
          description: 'Bring these fresh herbs to cô Hoa at the market.',
        },
        vi: {
          title: 'Rau thơm cho sạp phở',
          description: 'Mang rau thơm tươi này qua cho cô Hoa ở chợ.',
        },
      },
    },
  ],
  domain: {
    home: 'market',
    locations: ['market', 'alley', 'park'],
    npcs: ['hoa', 'tam', 'mai'],
    items: ['baguette', 'herbs', 'noodles', 'coffee', 'banana'],
    gifts: ['baguette', 'coffee'],
  },
}

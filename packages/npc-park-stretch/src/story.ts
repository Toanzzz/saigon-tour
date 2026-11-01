import type { NpcStory } from '@saigon/npc-kit'
import { gag } from './seeds/gag'

export const story: NpcStory = {
  seeds: [
    gag,
    {
      scope: 'solo',
      steps: [{ type: 'DELIVER', itemId: 'herbs', npcId: 'linh' }],
      text: {
        en: {
          title: 'Fresh herbs for the park lunch',
          description: 'Bring these herbs to chị Linh in the park.',
        },
        vi: {
          title: 'Rau thơm cho bữa trưa công viên',
          description: 'Mang rau thơm này đến cho chị Linh ở công viên.',
        },
      },
    },
  ],
  domain: {
    home: 'park',
    locations: ['park', 'market', 'river'],
    npcs: ['linh', 'hoa', 'ba'],
    items: ['banana', 'herbs', 'coffee', 'noodles'],
    gifts: ['banana', 'coffee'],
  },
}

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
          title: 'Herbs on the way to the park',
          description: 'Bring these herbs to chị Linh in the park.',
        },
        vi: {
          title: 'Rau thơm trên đường ra công viên',
          description: 'Mang rau thơm này đến cho chị Linh ở công viên.',
        },
      },
    },
  ],
  domain: {
    home: 'river',
    locations: ['river', 'park', 'market'],
    npcs: ['ba', 'linh', 'hoa'],
    items: ['banana', 'herbs', 'coffee', 'noodles'],
    gifts: ['banana', 'coffee'],
  },
}

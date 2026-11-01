import type { NpcStory } from '@saigon/npc-kit'

export const story: NpcStory = {
  seeds: [
    {
      scope: 'solo',
      steps: [{ type: 'DELIVER', itemId: 'herbs', npcId: 'linh' }],
      text: {
        en: {
          title: 'Fresh herbs for a neighbor',
          description: 'Bring these fresh herbs to Linh in the park.',
        },
        vi: {
          title: 'Rau thơm cho hàng xóm',
          description: 'Mang rau thơm này đến cho chị Linh ở công viên.',
        },
      },
    },
  ],
  domain: {
    home: 'market',
    locations: ['market', 'park', 'alley', 'cityhall'],
    npcs: ['linh', 'mai', 'tam', 'vy'],
    items: ['herbs', 'noodles', 'broth', 'baguette', 'coffee', 'banana'],
    gifts: ['postcard', 'coffee'],
  },
}

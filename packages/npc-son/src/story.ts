import type { NpcStory } from '@saigon/npc-kit'

export const story: NpcStory = {
  seeds: [
    {
      scope: 'solo',
      steps: [{ type: 'GO_TO', locationId: 'river' }],
      text: {
        en: {
          title: 'Room for a river view',
          description:
            'Visit the riverside to bring back a little inspiration.',
        },
        vi: {
          title: 'Chỗ cho cảnh sông',
          description: 'Ghé bờ sông để mang về chút cảm hứng.',
        },
      },
    },
  ],
  domain: {
    home: 'postoffice',
    locations: ['postoffice', 'river', 'cathedral', 'market', 'opera'],
    npcs: ['alex', 'ba', 'thao', 'mai'],
    items: ['postcard', 'photo', 'coffee'],
    gifts: ['photo', 'postcard'],
  },
}

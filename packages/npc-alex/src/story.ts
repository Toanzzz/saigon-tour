import type { NpcStory } from '@saigon/npc-kit'

export const story: NpcStory = {
  seeds: [
    {
      scope: 'solo',
      steps: [{ type: 'GO_TO', locationId: 'cathedral' }],
      text: {
        en: {
          title: 'Light across the square',
          description:
            'Visit the cathedral square and find the afternoon light.',
        },
        vi: {
          title: 'Ánh sáng qua quảng trường',
          description: 'Ghé quảng trường nhà thờ và tìm ánh nắng buổi chiều.',
        },
      },
    },
  ],
  domain: {
    home: 'opera',
    locations: ['opera', 'cathedral', 'postoffice', 'river', 'cityhall'],
    npcs: ['thao', 'son', 'vy', 'ba'],
    items: ['photo', 'postcard', 'coffee'],
    gifts: ['photo', 'postcard'],
  },
}

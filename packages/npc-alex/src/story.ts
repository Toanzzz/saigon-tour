import type { NpcStory } from '@saigon/npc-kit'
import { arc } from './seeds/arc'
import { gag } from './seeds/gag'
import { riddle } from './seeds/riddle'

export const story: NpcStory = {
  seeds: [
    arc,
    gag,
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
    riddle,
  ],
  domain: {
    home: 'opera',
    locations: ['opera', 'cathedral', 'postoffice', 'river', 'cityhall'],
    npcs: ['thao', 'son', 'vy', 'ba'],
    items: ['photo', 'postcard', 'coffee'],
    gifts: ['photo', 'postcard'],
  },
}

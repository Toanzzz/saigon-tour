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
    riddle,
  ],
  domain: {
    home: 'postoffice',
    locations: ['postoffice', 'river', 'cathedral', 'market', 'opera'],
    npcs: ['alex', 'ba', 'thao', 'mai'],
    items: ['postcard', 'photo', 'coffee'],
    gifts: ['photo', 'postcard'],
  },
}

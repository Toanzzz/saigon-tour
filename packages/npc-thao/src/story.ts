import type { NpcStory } from '@saigon/npc-kit'
import { arc } from './seeds/arc'
import { gag } from './seeds/gag'
import { milestone } from './seeds/milestone'
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
          title: 'An echo across the square',
          description: 'Listen to the city at the cathedral square.',
        },
        vi: {
          title: 'Tiếng vọng qua quảng trường',
          description: 'Lắng nghe thành phố ở quảng trường nhà thờ.',
        },
      },
    },
    riddle,
    milestone,
  ],
  domain: {
    home: 'opera',
    locations: ['opera', 'cathedral', 'cityhall', 'park'],
    npcs: ['alex', 'vy', 'son', 'linh'],
    items: ['postcard', 'photo', 'coffee'],
    gifts: ['postcard', 'photo', 'sheet-music'],
  },
}

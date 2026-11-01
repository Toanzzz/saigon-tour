import type { NpcStory } from '@saigon/npc-kit'
import { gag } from './seeds/gag'

export const story: NpcStory = {
  seeds: [
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
  ],
  domain: {
    home: 'opera',
    locations: ['opera', 'cathedral', 'cityhall', 'park'],
    npcs: ['alex', 'vy', 'son', 'linh'],
    items: ['postcard', 'photo', 'coffee'],
    gifts: ['postcard', 'photo'],
  },
}

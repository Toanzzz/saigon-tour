import type { NpcStory } from '@saigon/npc-kit'
import { arc } from './seeds/arc'
import { gag } from './seeds/gag'

export const story: NpcStory = {
  seeds: [
    arc,
    gag,
    {
      scope: 'solo',
      steps: [{ type: 'GO_TO', locationId: 'opera' }],
      text: {
        en: {
          title: 'A view along the river',
          description:
            'Visit the Opera House and find another side of our city.',
        },
        vi: {
          title: 'Ngắm cảnh dọc sông',
          description:
            'Ghé Nhà hát Thành phố và khám phá một góc khác của thành phố.',
        },
      },
    },
  ],
  domain: {
    home: 'river',
    locations: ['river', 'market', 'cityhall', 'opera'],
    npcs: ['tam', 'hoa', 'alex', 'son'],
    items: ['postcard', 'photo', 'coffee'],
    gifts: ['postcard', 'photo'],
  },
}

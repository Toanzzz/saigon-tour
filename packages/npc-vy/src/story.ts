import type { NpcStory } from '@saigon/npc-kit'
import { gag } from './seeds/gag'

export const story: NpcStory = {
  seeds: [
    gag,
    {
      scope: 'solo',
      steps: [{ type: 'GO_TO', locationId: 'alley' }],
      text: {
        en: {
          title: 'An evening walk',
          description:
            'Visit the food alley and look for a welcoming evening corner.',
        },
        vi: {
          title: 'Dạo phố buổi tối',
          description:
            'Ghé hẻm ẩm thực và tìm một góc phố buổi tối thật ấm cúng.',
        },
      },
    },
  ],
  domain: {
    home: 'cityhall',
    locations: ['cityhall', 'alley', 'market', 'opera'],
    npcs: ['hoa', 'mai', 'thao', 'alex'],
    items: ['postcard', 'photo', 'coffee', 'banana'],
    gifts: ['coffee', 'postcard'],
  },
}

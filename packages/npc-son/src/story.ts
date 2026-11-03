import type { NpcStory } from '@saigon/npc-kit'
import { arc } from './seeds/arc'
import { gag } from './seeds/gag'
import { riddle } from './seeds/riddle'

export const story: NpcStory = {
  completion: {
    en: 'Dear Friend: thank you for carrying a little care across the city. Some things deserve more than a stamp. Warmly, Sơn.',
    vi: 'Gửi bạn: cảm ơn đã mang chút quan tâm đi khắp phố. Có những điều quý hơn cả một con tem đẹp. Thương, Sơn.',
  },
  seeds: [
    arc,
    gag,
    {
      payoff: {
        en: 'You brought back a little river air. Thank you for the walk! Dear River: there is room for you on my next postcard.',
        vi: 'Bạn mang về chút gió sông rồi. Cảm ơn đã đi một vòng nha! Sông ơi, tấm bưu thiếp kế tiếp có chỗ cho sông rồi đó.',
      },
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

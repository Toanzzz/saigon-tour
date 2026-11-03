import type { NpcStory } from '@saigon/npc-kit'
import { arc } from './seeds/arc'
import { gag } from './seeds/gag'
import { milestone } from './seeds/milestone'

export const story: NpcStory = {
  completion: {
    en: 'Thank you, cháu. People remember a kind hand longer than a busy day. Sit by the river with me again sometime.',
    vi: 'Cảm ơn cháu. Ngày bận rồi cũng qua, còn người giúp mình thì nhớ lâu lắm. Bữa nào lại ngồi chơi bên sông với ông nhé.',
  },
  seeds: [
    arc,
    gag,
    {
      payoff: {
        en: 'You made it to the Opera House. Thank you for taking the walk, cháu. The city keeps a different story around every corner.',
        vi: 'Cháu ghé Nhà hát rồi. Cảm ơn đã chịu đi một vòng nha. Thành phố này, qua mỗi góc là có một câu chuyện khác.',
      },
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
    milestone,
  ],
  domain: {
    home: 'river',
    locations: ['river', 'market', 'cityhall', 'opera'],
    npcs: ['tam', 'hoa', 'alex', 'son'],
    items: ['postcard', 'photo', 'coffee'],
    gifts: ['postcard', 'photo', 'lanterns'],
  },
}

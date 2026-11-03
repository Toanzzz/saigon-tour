import type { NpcStory } from '@saigon/npc-kit'
import { arc } from './seeds/arc'
import { gag } from './seeds/gag'
import { milestone } from './seeds/milestone'
import { riddle } from './seeds/riddle'

export const story: NpcStory = {
  completion: {
    en: 'Thank you for listening, and for helping. You have given my little city song a warmer note.',
    vi: 'Cảm ơn bạn đã lắng nghe và giúp mình nha. Bài hát nhỏ về thành phố của mình có thêm một nốt ấm rồi.',
  },
  seeds: [
    arc,
    gag,
    {
      payoff: {
        en: 'You listened at the cathedral square. Thank you for sharing that quiet moment! The city sounds a little less lonely with someone else listening.',
        vi: 'Bạn lắng nghe ở quảng trường nhà thờ rồi. Cảm ơn đã chia sẻ chút yên đó nha! Có người cùng nghe, tiếng phố cũng bớt cô đơn.',
      },
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

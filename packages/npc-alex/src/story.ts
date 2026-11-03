import type { NpcStory } from '@saigon/npc-kit'
import { arc } from './seeds/arc'
import { gag } from './seeds/gag'
import { riddle } from './seeds/riddle'

export const story: NpcStory = {
  completion: {
    en: 'Thanks for helping me see more of this neighborhood. The best part of a picture is the people just outside the frame.',
    vi: 'Cảm ơn bạn đã giúp mình hiểu thêm về xóm này. Phần đẹp nhất của tấm hình đôi khi là những người đứng ngoài khung đó.',
  },
  seeds: [
    arc,
    gag,
    {
      payoff: {
        en: 'You found the light across the cathedral square! Thanks for looking with me. The city always gives us another angle.',
        vi: 'Bạn tìm được ánh sáng ngoài quảng trường nhà thờ rồi! Cảm ơn đã cùng mình ngắm nha. Thành phố lúc nào cũng cho thêm một góc nhìn.',
      },
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

import type { NpcStory } from '@saigon/npc-kit'
import { gag } from './seeds/gag'
import { riddle } from './seeds/riddle'

export const story: NpcStory = {
  completion: {
    en: 'Thanks, bạn! My map is old, but a kind neighbor is always a reliable landmark. I will remember this turn.',
    vi: 'Cảm ơn bạn nha! Bản đồ cũ thì cũ, chứ hàng xóm tử tế lúc nào cũng là cột mốc đáng tin. Chỗ rẽ này tôi nhớ rồi.',
  },
  seeds: [
    gag,
    {
      payoff: {
        en: 'Sơn has the photo at the post office! Thanks, bạn. That is one address my old map and I can finally agree on.',
        vi: 'Anh Sơn nhận ảnh ở bưu điện rồi! Cảm ơn bạn nha. Cuối cùng tôi với tấm bản đồ cũ cũng đồng ý được một địa chỉ.',
      },
      scope: 'solo',
      steps: [{ type: 'DELIVER', itemId: 'photo', npcId: 'son' }],
      text: {
        en: {
          title: 'A photo for the post office',
          description:
            'Bring this photo to anh Sơn at the Central Post Office.',
        },
        vi: {
          title: 'Tấm ảnh cho bưu điện',
          description: 'Mang tấm ảnh này đến cho anh Sơn ở Bưu điện Trung tâm.',
        },
      },
    },
    riddle,
  ],
  domain: {
    home: 'cathedral',
    locations: ['cathedral', 'cityhall', 'opera', 'postoffice'],
    npcs: ['vy', 'alex', 'son'],
    items: ['postcard', 'photo', 'coffee', 'banana'],
    gifts: ['postcard', 'coffee'],
  },
}

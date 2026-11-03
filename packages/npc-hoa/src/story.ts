import type { NpcStory } from '@saigon/npc-kit'
import { arc } from './seeds/arc'
import { gag } from './seeds/gag'

export const story: NpcStory = {
  completion: {
    en: 'Thank you, con. A little kindness goes a long way in this market. There is always a place for you at my stall.',
    vi: 'Cảm ơn con nha. Ở cái chợ này, thương nhau một chút là ấm bụng cả ngày. Ghé sạp cô chơi nữa nhé.',
  },
  seeds: [
    arc,
    gag,
    {
      payoff: {
        en: 'The herbs reached Linh for lunch. Thank you, con! That little bundle carries a whole bowl of care.',
        vi: 'Rau thơm tới chỗ chị Linh cho bữa trưa rồi. Cảm ơn con nha! Bó nhỏ vậy mà gói cả tô tình cảm đó.',
      },
      scope: 'solo',
      steps: [{ type: 'DELIVER', itemId: 'herbs', npcId: 'linh' }],
      text: {
        en: {
          title: 'Fresh herbs for a neighbor',
          description: 'Bring these fresh herbs to Linh in the park.',
        },
        vi: {
          title: 'Rau thơm cho hàng xóm',
          description: 'Mang rau thơm này đến cho chị Linh ở công viên.',
        },
      },
    },
  ],
  domain: {
    home: 'market',
    locations: ['market', 'park', 'alley', 'cityhall'],
    npcs: ['linh', 'mai', 'tam', 'vy'],
    items: ['herbs', 'noodles', 'broth', 'baguette', 'coffee', 'banana'],
    gifts: ['postcard', 'coffee'],
  },
}

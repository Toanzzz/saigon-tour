import type { NpcStory } from '@saigon/npc-kit'
import { gag } from './seeds/gag'

export const story: NpcStory = {
  completion: {
    en: 'Thanks, bạn! Helping a neighbor counts as a good rep. Take a breath; you have earned it.',
    vi: 'Cảm ơn bạn nha! Giúp hàng xóm cũng tính là một hiệp đẹp đó. Nghỉ lấy hơi chút đi, xứng đáng mà.',
  },
  seeds: [
    gag,
    {
      payoff: {
        en: 'The herbs reached Linh for the park lunch! Thanks, bạn. That is a proper recovery meal and a good-neighbor rep in one.',
        vi: 'Rau thơm tới chị Linh cho bữa trưa công viên rồi! Cảm ơn bạn nha. Vừa lo bữa hồi sức, vừa xong một hiệp hàng xóm tốt luôn.',
      },
      scope: 'solo',
      steps: [{ type: 'DELIVER', itemId: 'herbs', npcId: 'linh' }],
      text: {
        en: {
          title: 'Fresh herbs for the park lunch',
          description: 'Bring these herbs to chị Linh in the park.',
        },
        vi: {
          title: 'Rau thơm cho bữa trưa công viên',
          description: 'Mang rau thơm này đến cho chị Linh ở công viên.',
        },
      },
    },
  ],
  domain: {
    home: 'park',
    locations: ['park', 'market', 'river'],
    npcs: ['linh', 'hoa', 'ba'],
    items: ['banana', 'herbs', 'coffee', 'noodles'],
    gifts: ['banana', 'coffee'],
  },
}

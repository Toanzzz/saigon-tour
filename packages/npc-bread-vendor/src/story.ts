import type { NpcStory } from '@saigon/npc-kit'
import { gag } from './seeds/gag'

export const story: NpcStory = {
  completion: {
    en: 'Thanks, bạn! A good neighbor deserves the crispiest part of the loaf. Stop by whenever you hear the crust crackle.',
    vi: 'Cảm ơn bạn nha! Hàng xóm dễ thương phải được phần bánh giòn nhất. Nghe tiếng vỏ bánh rộp rộp thì ghé chú nhé.',
  },
  seeds: [
    gag,
    {
      payoff: {
        en: 'Cô Hoa has the fresh herbs! Thanks, bạn. Her pho and my baguettes can both start the market day properly now.',
        vi: 'Cô Hoa có rau thơm rồi! Cảm ơn bạn nha. Phở của cô với bánh mì của chú đều sẵn sàng mở hàng cho ra trò rồi.',
      },
      scope: 'solo',
      steps: [{ type: 'DELIVER', itemId: 'herbs', npcId: 'hoa' }],
      text: {
        en: {
          title: 'Herbs for the pho stall',
          description: 'Bring these fresh herbs to cô Hoa at the market.',
        },
        vi: {
          title: 'Rau thơm cho sạp phở',
          description: 'Mang rau thơm tươi này qua cho cô Hoa ở chợ.',
        },
      },
    },
  ],
  domain: {
    home: 'market',
    locations: ['market', 'alley', 'park'],
    npcs: ['hoa', 'tam', 'mai'],
    items: ['baguette', 'herbs', 'noodles', 'coffee', 'banana'],
    gifts: ['baguette', 'coffee'],
  },
}

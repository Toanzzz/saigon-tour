import type { NpcStory } from '@saigon/npc-kit'
import { arc } from './seeds/arc'
import { gag } from './seeds/gag'
import { milestone } from './seeds/milestone'

export const story: NpcStory = {
  completion: {
    en: 'Thank you. Tasting notes for today: a little effort, a lot of kindness. Your usual seat is waiting.',
    vi: 'Cảm ơn bạn nha. Hương vị hôm nay: một chút công, thật nhiều tình. Chỗ quen của bạn vẫn ở đây nè.',
  },
  seeds: [
    arc,
    gag,
    {
      payoff: {
        en: 'Cô Hoa has her coffee. Thank you! Tasting notes: a little sweetness, a busy market, and a very kind delivery.',
        vi: 'Cô Hoa nhận cà phê rồi. Cảm ơn bạn nha! Hương vị: một chút ngọt, một buổi chợ đông, một người giao dễ thương.',
      },
      scope: 'solo',
      steps: [{ type: 'DELIVER', itemId: 'coffee', npcId: 'hoa' }],
      text: {
        en: {
          title: 'Coffee for Ms. Hoa',
          description: 'Take this coffee across the market to Ms. Hoa.',
        },
        vi: {
          title: 'Cà phê cho cô Hoa',
          description: 'Mang ly cà phê này qua chợ cho cô Hoa.',
        },
      },
    },
    milestone,
  ],
  domain: {
    home: 'market',
    locations: ['market', 'alley', 'park', 'postoffice'],
    npcs: ['hoa', 'tam', 'linh', 'son'],
    items: ['coffee', 'banana', 'baguette', 'postcard'],
    gifts: ['coffee', 'banana', 'coffee-beans'],
  },
}

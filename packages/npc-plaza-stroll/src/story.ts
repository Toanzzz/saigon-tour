import type { NpcStory } from '@saigon/npc-kit'
import { gag } from './seeds/gag'

export const story: NpcStory = {
  completion: {
    en: 'Thank you, bạn. A kind gesture needs no spotlight, but yours deserves a little applause.',
    vi: 'Cảm ơn bạn nha. Một việc tử tế đâu cần đèn sân khấu, nhưng việc của bạn đáng một tràng vỗ tay đó.',
  },
  seeds: [
    gag,
    {
      payoff: {
        en: 'Vy has the keepsake photo! Thank you, bạn. A little memory has found its next scene, and you delivered the line beautifully.',
        vi: 'Chị Vy nhận tấm hình kỷ niệm rồi! Cảm ơn bạn nha. Chút ký ức có cảnh diễn mới, còn bạn mang lời tới thật đẹp.',
      },
      scope: 'solo',
      steps: [{ type: 'DELIVER', itemId: 'photo', npcId: 'vy' }],
      text: {
        en: {
          title: 'A keepsake for a neighbor',
          description: 'Bring this photo to chị Vy at City Hall.',
        },
        vi: {
          title: 'Kỷ vật cho hàng xóm',
          description: 'Mang tấm ảnh này đến cho chị Vy ở Tòa Thị Chính.',
        },
      },
    },
  ],
  domain: {
    home: 'cityhall',
    locations: ['cityhall', 'opera', 'market'],
    npcs: ['vy', 'alex', 'thao'],
    items: ['postcard', 'photo', 'coffee', 'banana'],
    gifts: ['postcard', 'coffee'],
  },
}

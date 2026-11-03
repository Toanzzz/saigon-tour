import type { NpcStory } from '@saigon/npc-kit'
import { gag } from './seeds/gag'

export const story: NpcStory = {
  completion: {
    en: 'Thank you, bạn. Generous portion, lovely finish: your kindness scores a ten. No tasting notes needed.',
    vi: 'Cảm ơn bạn nha. Phần hào phóng, hậu vị dễ thương: lòng tốt của bạn được mười điểm. Khỏi cần ghi chú nếm thử luôn.',
  },
  seeds: [
    gag,
    {
      payoff: {
        en: 'Linh has the noodles for the park lunch! Thank you, bạn. A generous delivery with a lovely finish: ten points for sharing.',
        vi: 'Chị Linh có mì cho bữa trưa công viên rồi! Cảm ơn bạn nha. Giao hào phóng, hậu vị dễ thương: mười điểm chia sẻ.',
      },
      scope: 'solo',
      steps: [{ type: 'DELIVER', itemId: 'noodles', npcId: 'linh' }],
      text: {
        en: {
          title: 'Noodles for the park lunch',
          description: 'Bring these noodles to chị Linh in the park.',
        },
        vi: {
          title: 'Mì cho bữa trưa công viên',
          description: 'Mang phần mì này đến cho chị Linh ở công viên.',
        },
      },
    },
  ],
  domain: {
    home: 'alley',
    locations: ['alley', 'market', 'park'],
    npcs: ['hoa', 'tam', 'linh'],
    items: ['broth', 'noodles', 'herbs', 'baguette', 'coffee', 'banana'],
    gifts: ['baguette', 'coffee'],
  },
}

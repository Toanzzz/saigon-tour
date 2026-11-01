import type { NpcStory } from '@saigon/npc-kit'
import { gag } from './seeds/gag'

export const story: NpcStory = {
  seeds: [
    gag,
    {
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

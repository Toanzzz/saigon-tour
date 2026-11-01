import type { NpcStory } from '@saigon/npc-kit'
import { gag } from './seeds/gag'

export const story: NpcStory = {
  seeds: [
    gag,
    {
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

import type { NpcStory } from '@saigon/npc-kit'
import { gag } from './seeds/gag'

export const story: NpcStory = {
  seeds: [
    gag,
    {
      scope: 'solo',
      steps: [{ type: 'TALK_TO', npcId: 'ba' }],
      text: {
        en: {
          title: 'A riverside hello',
          description: 'Check on Mr. Ba by the river and say hello.',
        },
        vi: {
          title: 'Lời chào bên sông',
          description: 'Ghé thăm ông Ba bên sông và chào ông một tiếng.',
        },
      },
    },
  ],
  domain: {
    home: 'market',
    locations: ['market', 'park', 'river', 'cityhall'],
    npcs: ['hoa', 'linh', 'ba', 'mai'],
    items: ['coffee', 'banana', 'postcard'],
    gifts: ['coffee', 'postcard'],
  },
}

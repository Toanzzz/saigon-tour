import { RESIDENTS } from '../residents'
import type { QuestDomain } from './domains'
export const RESIDENT_DOMAINS = Object.fromEntries(
  Object.values(RESIDENTS).map((npc) => [
    npc.id,
    {
      home: npc.location,
      locations: [npc.location, 'market', 'park'],
      npcs: ['hoa', 'linh'],
      items: ['coffee', 'banana'],
      gifts: ['postcard'],
    },
  ])
) as Record<keyof typeof RESIDENTS, QuestDomain>

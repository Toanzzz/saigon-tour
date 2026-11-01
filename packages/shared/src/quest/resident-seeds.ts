import { RESIDENTS } from '../residents'
import type { SeedCatalog } from './seeds'
export const RESIDENT_SEEDS: SeedCatalog[] = Object.values(RESIDENTS).map(
  (npc) => ({
    giverNpcId: npc.id,
    scope: 'solo',
    steps: [
      { type: 'TALK_TO', npcId: npc.location === 'park' ? 'hoa' : 'linh' },
    ],
    text: {
      en: {
        title: `${npc.name}'s neighborhood hello`,
        description: `Say hello to ${npc.location === 'park' ? 'Cô Hoa at the market' : 'Chị Linh in the park'} for the ${npc.role.toLowerCase()}, then return.`,
      },
      vi: {
        title: `Lời nhắn của ${npc.name}`,
        description: `Gửi lời chào đến ${npc.location === 'park' ? 'cô Hoa ở chợ' : 'chị Linh ở công viên'} rồi quay lại nhé.`,
      },
    },
  })
)

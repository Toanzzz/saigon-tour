import { npcName } from '../localized-names'
import { RESIDENT_TEXT } from '../resident-text'
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
        title: `${npcName(npc.id, 'en')}'s neighborhood hello`,
        description: `Say hello to ${npc.location === 'park' ? 'Ms. Hoa at the market' : 'Linh in the park'} for the ${RESIDENT_TEXT[npc.id].en.role.toLowerCase()}, then return.`,
      },
      vi: {
        title: `Lời nhắn của ${npcName(npc.id, 'vi')}`,
        description: `Gửi lời chào đến ${npc.location === 'park' ? 'cô Hoa ở chợ' : 'chị Linh ở công viên'} rồi quay lại nhé.`,
      },
    },
  })
)

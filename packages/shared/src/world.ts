import type { NpcId, Reward } from './contracts'
import type { Locale } from './locale'
import { NPC_NAMES } from './localized-names'
import { NEIGHBOR_TEXT } from './neighbor-text'
import { NPCS, type NpcPersona } from './npcs/derive'
import { RESIDENT_TEXT } from './resident-text'

export type { NpcPersona }
export { NPCS }

export function npcText(id: NpcId, locale: Locale = 'en') {
  const text =
    id in NEIGHBOR_TEXT
      ? NEIGHBOR_TEXT[id as keyof typeof NEIGHBOR_TEXT][locale]
      : RESIDENT_TEXT[id as keyof typeof RESIDENT_TEXT][locale]
  return { name: NPC_NAMES[id][locale], ...text }
}

export const STARTING_CURRENCY = 30
export const BUS_FARE = 5
export const ZERO_REWARD: Reward = { currency: 0, itemId: null, reputation: 0 }

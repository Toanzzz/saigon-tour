import type { UnlockSpec } from '@saigon/npc-kit'

export const unlocks: UnlockSpec[] = [
  {
    id: 'scarf',
    kind: 'cosmetic',
    slot: 'accessory',
    tier: 'neutral',
    model: 'cosmetics/scarf',
    scale: 1,
  },
  {
    id: 'barista',
    kind: 'cosmetic',
    slot: 'outfit',
    tier: 'warm',
    palette: { 'outfit-top': '#3b2f2a', 'outfit-bottom': '#241c19' },
  },
  {
    id: 'cat',
    kind: 'pet',
    slot: 'pet',
    tier: 'close',
    model: 'pets/cat',
    scale: 0.5,
  },
]

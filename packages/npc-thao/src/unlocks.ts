import type { UnlockSpec } from '@saigon/npc-kit'

export const unlocks: UnlockSpec[] = [
  {
    id: 'headphones',
    kind: 'cosmetic',
    slot: 'accessory',
    tier: 'neutral',
    model: 'cosmetics/headphones',
    scale: 1,
  },
  {
    id: 'ao-dai',
    kind: 'cosmetic',
    slot: 'outfit',
    tier: 'warm',
    palette: { 'outfit-top': '#e86a9b', 'outfit-bottom': '#f3ead6' },
  },
  {
    id: 'chick',
    kind: 'pet',
    slot: 'pet',
    tier: 'close',
    model: 'pets/chick',
    scale: 0.5,
  },
]

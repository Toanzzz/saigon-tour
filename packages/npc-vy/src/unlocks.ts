import type { UnlockSpec } from '@saigon/npc-kit'

export const unlocks: UnlockSpec[] = [
  {
    id: 'lantern-backpack',
    kind: 'cosmetic',
    slot: 'accessory',
    tier: 'neutral',
    model: 'cosmetics/lantern-backpack',
    scale: 1,
  },
  {
    id: 'evening',
    kind: 'cosmetic',
    slot: 'outfit',
    tier: 'warm',
    palette: { 'outfit-top': '#2b3566', 'outfit-bottom': '#1b2244' },
  },
  {
    id: 'lantern-hat',
    kind: 'cosmetic',
    slot: 'hat',
    tier: 'close',
    model: 'cosmetics/lantern-hat',
    scale: 1,
  },
]

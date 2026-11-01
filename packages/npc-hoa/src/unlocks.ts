import type { UnlockSpec } from '@saigon/npc-kit'

export const unlocks: UnlockSpec[] = [
  {
    id: 'non-la',
    kind: 'cosmetic',
    slot: 'hat',
    tier: 'neutral',
    model: 'cosmetics/non-la',
    scale: 1,
  },
  {
    id: 'apron',
    kind: 'cosmetic',
    slot: 'outfit',
    tier: 'warm',
    palette: { 'outfit-top': '#d94f45', 'outfit-bottom': '#a8382f' },
  },
  {
    id: 'dog',
    kind: 'pet',
    slot: 'pet',
    tier: 'close',
    model: 'pets/dog',
    scale: 0.5,
  },
]

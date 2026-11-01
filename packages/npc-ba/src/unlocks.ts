import type { UnlockSpec } from '@saigon/npc-kit'

export const unlocks: UnlockSpec[] = [
  {
    id: 'bucket-hat',
    kind: 'cosmetic',
    slot: 'hat',
    tier: 'neutral',
    model: 'cosmetics/bucket-hat',
    scale: 1,
  },
  {
    id: 'ao-ba-ba',
    kind: 'cosmetic',
    slot: 'outfit',
    tier: 'warm',
    palette: { 'outfit-top': '#5a4a7a', 'outfit-bottom': '#3f3357' },
  },
  {
    id: 'basket-bicycle',
    kind: 'vehicle',
    slot: 'vehicle',
    tier: 'close',
    scale: 1,
    speed: 5.5,
  },
]

import type { UnlockSpec } from '@saigon/npc-kit'

export const unlocks: UnlockSpec[] = [
  {
    id: 'helmet',
    kind: 'cosmetic',
    slot: 'hat',
    tier: 'neutral',
    model: 'cosmetics/helmet',
    attachment: 'head',
    scale: 1,
  },
  {
    id: 'sunglasses',
    kind: 'cosmetic',
    slot: 'accessory',
    tier: 'warm',
    model: 'cosmetics/sunglasses',
    attachment: 'head',
    scale: 1,
  },
  {
    id: 'cub',
    kind: 'vehicle',
    slot: 'vehicle',
    tier: 'close',
    model: 'vehicles/cub',
    scale: 1,
    speed: 7,
  },
]

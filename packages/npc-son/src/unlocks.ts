import type { UnlockSpec } from '@saigon/npc-kit'

export const unlocks: UnlockSpec[] = [
  {
    id: 'satchel',
    kind: 'cosmetic',
    slot: 'accessory',
    tier: 'neutral',
    model: 'cosmetics/satchel',
    scale: 1,
  },
  {
    id: 'beret',
    kind: 'cosmetic',
    slot: 'hat',
    tier: 'warm',
    model: 'cosmetics/beret',
    scale: 1,
  },
  {
    id: 'parrot',
    kind: 'pet',
    slot: 'pet',
    tier: 'close',
    model: 'pets/parrot',
    scale: 0.5,
  },
]

import type { UnlockSpec } from '@saigon/npc-kit'

export const unlocks: UnlockSpec[] = [
  {
    id: 'volunteer-cap',
    kind: 'cosmetic',
    slot: 'hat',
    tier: 'neutral',
    model: 'cosmetics/volunteer-cap',
    scale: 1,
  },
  {
    id: 'bicycle',
    kind: 'vehicle',
    slot: 'vehicle',
    tier: 'warm',
    scale: 1,
    speed: 5.5,
  },
  {
    id: 'bunny',
    kind: 'pet',
    slot: 'pet',
    tier: 'close',
    model: 'pets/bunny',
    scale: 0.5,
  },
]

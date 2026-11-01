import type { UnlockSpec } from '@saigon/npc-kit'

export const unlocks: UnlockSpec[] = [
  {
    id: 'camera-strap',
    kind: 'cosmetic',
    slot: 'accessory',
    tier: 'neutral',
    model: 'cosmetics/camera-strap',
    scale: 1,
  },
  {
    id: 'photo-vest',
    kind: 'cosmetic',
    slot: 'outfit',
    tier: 'warm',
    palette: { 'outfit-top': '#6b7d53', 'outfit-bottom': '#4b5a39' },
  },
  {
    id: 'vespa',
    kind: 'vehicle',
    slot: 'vehicle',
    tier: 'close',
    model: 'vehicles/vespa',
    scale: 1,
    speed: 7.5,
  },
]

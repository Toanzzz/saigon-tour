import type { UnlockSpec } from '@saigon/npc-kit'

export const unlocks: UnlockSpec[] = [
  {
    id: 'lantern-backpack',
    kind: 'cosmetic',
    slot: 'accessory',
    tier: 'neutral',
    model: 'cosmetics/lantern-backpack',
    attachment: 'torso',
    scale: 1,
  },
  {
    id: 'evening',
    outfitModels: {
      man: 'outfits/evening-man',
      woman: 'outfits/evening-woman',
    },
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
    attachment: 'head',
    scale: 1,
  },
]

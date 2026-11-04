import { z } from 'zod'
import type { ShopUnlock } from './catalog'

export const RareWearableIdSchema = z.enum([
  'lacquer-non-la',
  'silk-scarf',
  'festival-ao-dai',
])
export type RareWearableId = z.infer<typeof RareWearableIdSchema>

export const RARE_WEARABLES = {
  'lacquer-non-la': {
    id: 'lacquer-non-la',
    acquisition: 'shop',
    kind: 'cosmetic',
    slot: 'hat',
    price: 800,
    model: 'cosmetics/lacquer-non-la',
    attachment: 'head',
    scale: 1,
  },
  'silk-scarf': {
    id: 'silk-scarf',
    acquisition: 'shop',
    kind: 'cosmetic',
    slot: 'accessory',
    price: 1100,
    model: 'cosmetics/silk-scarf',
    attachment: 'torso',
    scale: 1,
  },
  'festival-ao-dai': {
    id: 'festival-ao-dai',
    acquisition: 'shop',
    kind: 'cosmetic',
    slot: 'outfit',
    price: 1500,
    outfitModels: {
      man: 'outfits/festival-ao-dai-man',
      woman: 'outfits/festival-ao-dai-woman',
    },
    palette: { 'outfit-top': '#192b51', 'outfit-bottom': '#24283b' },
  },
} as const satisfies Record<RareWearableId, ShopUnlock>

import { UNLOCK_SPECS } from '../npcs/derive'
import type { UnlockDef } from './catalog'

/** Hats, outfits and accessories, derived from each neighbor's package. */
export const COSMETIC_UNLOCKS: UnlockDef[] = UNLOCK_SPECS.filter(
  (u) => u.kind === 'cosmetic'
).map((entry) => ({ ...entry, acquisition: 'friendship' }))

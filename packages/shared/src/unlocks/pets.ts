import { UNLOCK_SPECS } from '../npcs/derive'
import type { UnlockDef } from './catalog'

/** Follower pets, derived from each neighbor's package. */
export const PET_UNLOCKS: UnlockDef[] = UNLOCK_SPECS.filter(
  (u) => u.kind === 'pet'
).map((entry) => ({ ...entry, acquisition: 'friendship' }))

import { UNLOCK_SPECS } from '../npcs/derive'
import type { UnlockDef } from './catalog'

/** Personal rides, derived from each neighbor's package. */
export const VEHICLE_UNLOCKS: UnlockDef[] = UNLOCK_SPECS.filter(
  (u) => u.kind === 'vehicle'
)

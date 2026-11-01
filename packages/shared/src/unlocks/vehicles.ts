import type { UnlockDef } from './catalog'

/** Personal rides. Speeds stay below the bus (10) so fares remain worth paying. */
export const VEHICLE_UNLOCKS: UnlockDef[] = [
  {
    id: 'cub',
    kind: 'vehicle',
    slot: 'vehicle',
    giver: 'tam',
    tier: 'close',
    model: 'vehicles/cub',
    scale: 1,
    speed: 7,
  },
  {
    id: 'bicycle',
    kind: 'vehicle',
    slot: 'vehicle',
    giver: 'linh',
    tier: 'warm',
    // No bicycle GLB ships; PersonalVehicle renders the procedural Bike.
    scale: 1,
    speed: 5.5,
  },
  {
    id: 'basket-bicycle',
    kind: 'vehicle',
    slot: 'vehicle',
    giver: 'ba',
    tier: 'close',
    // No basket-bicycle GLB ships; PersonalVehicle renders the procedural Bike (cyclo).
    scale: 1,
    speed: 5.5,
  },
  {
    id: 'vespa',
    kind: 'vehicle',
    slot: 'vehicle',
    giver: 'alex',
    tier: 'close',
    model: 'vehicles/vespa',
    scale: 1,
    speed: 7.5,
  },
]

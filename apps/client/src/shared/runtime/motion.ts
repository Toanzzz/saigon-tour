import { Vector3 } from 'three'
import { SPAWN } from '@/shared/world/places'

export const motion = {
  position: new Vector3(...SPAWN),
  heading: 0,
  moving: false,
  sprinting: false,
  frames: 0,
  dt: 1 / 60,
  /** Pending teleport, consumed by the player's next frame. */
  teleport: null as [number, number] | null,
}

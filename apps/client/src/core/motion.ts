import { Vector3 } from 'three'
import { SPAWN } from './places'

export const motion = {
  position: new Vector3(...SPAWN),
  heading: 0,
  moving: false,
  sprinting: false,
  frames: 0,
  dt: 1 / 60,
}

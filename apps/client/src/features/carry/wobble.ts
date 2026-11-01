/**
 * Pure spring-damper for the fragile-parcel gag. No React, no time source of
 * its own: `step` takes an explicit `dtSeconds` so the simulation is
 * deterministic and unit-testable. The angle is in radians, measured from
 * upright (0 = perfectly level).
 */

export interface Wobble {
  angle: number
  velocity: number
}

/** Restoring force toward upright; higher pulls the cake back faster. */
export const STIFFNESS = 42
/** Velocity drag; higher settles the wobble sooner. */
export const DAMPING = 7

export const newWobble = (): Wobble => ({ angle: 0, velocity: 0 })

/**
 * Advance the spring by `dtSeconds`, first adding `impulse` to the velocity.
 * Uses semi-implicit Euler, which stays stable for the frame steps we feed it.
 */
export function step(state: Wobble, dtSeconds: number, impulse = 0): Wobble {
  const dt = Math.max(0, Math.min(dtSeconds, 0.05))
  const accel = -STIFFNESS * state.angle - DAMPING * state.velocity
  const velocity = state.velocity + accel * dt + impulse
  const angle = state.angle + velocity * dt
  return { angle, velocity }
}

/**
 * Impulse magnitude from a change in speed and a change in heading. Sprint
 * toggles and sharp turns jolt the tray; gentle rides contribute nothing.
 */
export function impulseFrom(dSpeed: number, dHeading: number): number {
  const turn = Math.min(Math.abs(dHeading), Math.PI)
  return Math.abs(dSpeed) * 0.9 + turn * 1.1
}

export type CareLevel = 'pristine' | 'wobbly' | 'landscape'
export const CARE_LEVELS: readonly CareLevel[] = [
  'pristine',
  'wobbly',
  'landscape',
] as const

/** Peak absolute wobble angle (radians) that tips into each care level. */
export const WOBBLY_THRESHOLD = 0.22
export const LANDSCAPE_THRESHOLD = 0.6

/** Map the peak absolute wobble reached during a carry to a care level. */
export function careFor(peak: number): CareLevel {
  const magnitude = Math.abs(peak)
  if (magnitude >= LANDSCAPE_THRESHOLD) return 'landscape'
  if (magnitude >= WOBBLY_THRESHOLD) return 'wobbly'
  return 'pristine'
}

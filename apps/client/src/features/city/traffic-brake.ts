/**
 * Pure brake/honk trigger for the scooter swarm (map Phase 5c). No React, no
 * clock. A scooter brakes only when an obstacle (the player, or the ride
 * vehicle) is inside a short cone directly ahead, and only once per cooldown.
 * The gag never moves the player: the caller just slows and wobbles the
 * scooter, so Rapier stays untouched.
 */

export type Vec2 = [number, number]

/** How far ahead the cone reaches. */
export const CONE_LENGTH = 3.5
/** Cone half-width as a dot-product threshold: ~45° to each side. */
export const CONE_COS = 0.7
/** Per-scooter cooldown between honks. */
export const COOLDOWN_MS = 8000

/**
 * Is `target` inside the forward cone of a scooter at `pos` facing `heading`
 * (yaw about +y, 0 = +z, matching the lane headings)? The cone is CONE_LENGTH
 * long and opens to CONE_COS.
 */
export function inForwardCone(
  pos: Vec2,
  heading: number,
  target: Vec2
): boolean {
  const dx = target[0] - pos[0]
  const dz = target[1] - pos[1]
  const dist = Math.hypot(dx, dz)
  if (dist === 0 || dist > CONE_LENGTH) return false
  const fx = Math.sin(heading)
  const fz = Math.cos(heading)
  const dot = (dx * fx + dz * fz) / dist
  return dot >= CONE_COS
}

/**
 * Decide whether a scooter honks this step. `targets` holds every obstacle the
 * swarm yields to (player, ride vehicle). Returns true only when one is in the
 * cone and the cooldown has elapsed; the caller then records `now` as the new
 * `lastHonk`.
 */
export function shouldHonk(
  pos: Vec2,
  heading: number,
  targets: Vec2[],
  lastHonk: number,
  now: number
): boolean {
  if (now - lastHonk < COOLDOWN_MS) return false
  return targets.some((t) => inForwardCone(pos, heading, t))
}

import type { NpcId } from '@saigon/shared'

/** An NPC candidate for an umbrella: its id and current world position. */
export type UmbrellaCandidate = {
  id: NpcId
  position: [number, number, number]
}

/** A chosen umbrella: the NPC plus its squared distance to the viewer. */
export type UmbrellaPick = UmbrellaCandidate & { distanceSq: number }

/** Maximum umbrellas and the visibility radius (horizontal units). */
export const UMBRELLA_MAX = 16
export const UMBRELLA_RADIUS = 40

/**
 * Pick up to `max` NPCs nearest to the viewer within `radius` (horizontal
 * distance), nearest first. Pure so the selection is unit-testable. Ties break
 * by id so the order is deterministic.
 */
export function pickUmbrellas(
  candidates: UmbrellaCandidate[],
  viewer: [number, number, number],
  max = UMBRELLA_MAX,
  radius = UMBRELLA_RADIUS
): UmbrellaPick[] {
  const radiusSq = radius * radius
  const within: UmbrellaPick[] = []
  for (const candidate of candidates) {
    const dx = candidate.position[0] - viewer[0]
    const dz = candidate.position[2] - viewer[2]
    const distanceSq = dx * dx + dz * dz
    if (distanceSq <= radiusSq) within.push({ ...candidate, distanceSq })
  }
  within.sort((a, b) =>
    a.distanceSq === b.distanceSq
      ? a.id.localeCompare(b.id)
      : a.distanceSq - b.distanceSq
  )
  return within.slice(0, max)
}

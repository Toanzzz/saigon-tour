import type { TravelMode } from '@saigon/shared'
import { m } from '@/shared/i18n'
import { notify } from '@/shared/state/game'

// narrator asides fire at most once per 20 s so the city stays quiet.
const COOLDOWN_MS = 20000
/** A long leg is worth narrating on foot; a short one on a paid ride. */
const SHORT_LEG = 60
const LONG_LEG = 120

let lastAsideAt = Number.NEGATIVE_INFINITY
let lastPlace: string | null = null

/** Reset the throttle so restart()/tests start quiet. */
export function resetAsides(): void {
  lastAsideAt = Number.NEGATIVE_INFINITY
  lastPlace = null
}

/** The deterministic aside for a completed leg, or null when none fits. */
export function asideFor(
  mode: TravelMode | 'walk',
  legDistance: number
): string | null {
  if (mode === 'walk')
    return legDistance > LONG_LEG ? m.aside_walk_long() : null
  if (mode === 'xeom')
    return legDistance < SHORT_LEG ? m.aside_xeom_short() : null
  if (mode === 'metro') return legDistance > LONG_LEG ? m.aside_metro() : null
  if (mode === 'bus') return legDistance > LONG_LEG ? m.aside_bus() : null
  return null
}

/**
 * Narrate an arrival at most once per 20 s. `place` guards against the walk
 * detector firing every frame: an aside only speaks once per new place.
 */
export function arriveAside(
  mode: TravelMode | 'walk',
  legDistance: number,
  place: string,
  now = Date.now()
): void {
  if (place === lastPlace) return
  lastPlace = place
  if (now - lastAsideAt < COOLDOWN_MS) return
  const line = asideFor(mode, legDistance)
  if (!line) return
  lastAsideAt = now
  notify(line)
}

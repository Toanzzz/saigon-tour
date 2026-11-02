/**
 * Pure scheduler for the street cries (map Phase 5b). No React, no clock, no
 * randomness source of its own: the caller passes `now` and a `0..1` roll so
 * the component owns the frame loop and the tests own determinism.
 *
 * Each anchor shows one DOM bubble every 6–10 s for 3.5 s when the player is
 * within 18 units. At most two bubbles are visible at once, and an anchor is
 * skipped while any NPC bubble sits within 5 units of it.
 */

/** Horizontal `[x, z]` position. */
export type Vec2 = [number, number]

/** An authored cry source: where it stands and which cries it can shout. */
export interface CryAnchor {
  id: string
  at: Vec2
  /** Message keys from the look-guide cry table; one is picked per show. */
  cries: string[]
}

/** Per-anchor runtime: the active bubble (if any) and the next eligible time. */
export interface CryState {
  /** The cry key currently shown, or null when idle. */
  showing: string | null
  /** When the current bubble hides (ms). */
  hideAt: number
  /** Earliest ms the anchor may shout again. */
  nextAt: number
}

/** A visible bubble the component should render. */
export interface CryBubble {
  id: string
  at: Vec2
  cry: string
}

export const CRY_RADIUS = 18
export const CRY_RADIUS_SQ = CRY_RADIUS * CRY_RADIUS
export const NPC_BACKOFF = 5
export const NPC_BACKOFF_SQ = NPC_BACKOFF * NPC_BACKOFF
export const CRY_VISIBLE_MS = 3500
export const CRY_GAP_MIN_MS = 6000
export const CRY_GAP_MAX_MS = 10000
export const MAX_VISIBLE = 2

export const newCryState = (): CryState => ({
  showing: null,
  hideAt: 0,
  nextAt: 0,
})

const distSq = (a: Vec2, b: Vec2) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2

/** Is the player close enough for this anchor to be audible? */
export function inRange(anchor: CryAnchor, player: Vec2): boolean {
  return distSq(anchor.at, player) <= CRY_RADIUS_SQ
}

/** Does an NPC bubble sit close enough to mute this anchor? */
export function nearNpcBubble(anchor: CryAnchor, npcBubbles: Vec2[]): boolean {
  return npcBubbles.some((b) => distSq(anchor.at, b) <= NPC_BACKOFF_SQ)
}

/**
 * Advance every anchor one step. `roll` is `0..1`: it both staggers the next
 * gap (6–10 s) and picks which cry shows. Mutating input is avoided; a fresh
 * state map is returned so callers can diff it. `visibleCount` seeds the
 * at-most-two cap deterministically in iteration order.
 */
export function stepCries(
  anchors: CryAnchor[],
  states: Record<string, CryState>,
  player: Vec2,
  npcBubbles: Vec2[],
  now: number,
  roll: (anchorId: string) => number
): { states: Record<string, CryState>; bubbles: CryBubble[] } {
  const next: Record<string, CryState> = {}
  const bubbles: CryBubble[] = []
  // Pass 1: expire finished bubbles. Everything still showing after this holds
  // its slot, so count it up front — otherwise an already-showing anchor later
  // in the list could push the total past the cap when an earlier idle anchor
  // starts a new bubble.
  let visible = 0
  for (const anchor of anchors) {
    const prev = states[anchor.id] ?? newCryState()
    let state: CryState = { ...prev }
    if (state.showing && now >= state.hideAt) {
      const r = roll(anchor.id)
      state = {
        showing: null,
        hideAt: 0,
        nextAt: now + CRY_GAP_MIN_MS + r * (CRY_GAP_MAX_MS - CRY_GAP_MIN_MS),
      }
    }
    if (state.showing) visible++
    next[anchor.id] = state
  }
  // Pass 2: start new bubbles only while under the cap counting ALL holders.
  for (const anchor of anchors) {
    const state = next[anchor.id]
    if (
      !state.showing &&
      now >= state.nextAt &&
      visible < MAX_VISIBLE &&
      inRange(anchor, player) &&
      !nearNpcBubble(anchor, npcBubbles)
    ) {
      const r = roll(anchor.id)
      const cry =
        anchor.cries[Math.floor(r * anchor.cries.length) % anchor.cries.length]
      next[anchor.id] = {
        showing: cry,
        hideAt: now + CRY_VISIBLE_MS,
        nextAt: 0,
      }
      visible++
    }
  }
  for (const anchor of anchors) {
    const state = next[anchor.id]
    if (state.showing)
      bubbles.push({ id: anchor.id, at: anchor.at, cry: state.showing })
  }
  return { states: next, bubbles }
}

/**
 * Authored cry anchors (map Phase 5b): market stalls, the Bùi Viện alley, the
 * Nguyễn Huệ kiosks and the river vendors. Positions sit on the paved
 * dressing, not on the road; each carries 2–3 look-guide cries. Scenery only.
 */
export const CRY_ANCHORS: CryAnchor[] = [
  { id: 'market-stalls', at: [-23, 3.4], cries: ['cry_coffee', 'cry_banhmi'] },
  { id: 'market-west', at: [-36, 1.5], cries: ['cry_banhmi', 'cry_che'] },
  { id: 'alley', at: [-20, 29], cries: ['cry_che', 'cry_coffee', 'cry_corn'] },
  { id: 'nguyen-hue', at: [69, 3], cries: ['cry_sugarcane', 'cry_coconut'] },
  { id: 'river-west', at: [40, 36], cries: ['cry_coconut', 'cry_sugarcane'] },
  { id: 'river-east', at: [78, 36], cries: ['cry_corn', 'cry_coconut'] },
]

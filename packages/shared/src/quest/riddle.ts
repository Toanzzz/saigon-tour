import type { Quest } from './schema'

/** Four minutes: the riddle always reveals itself by then. */
export const RIDDLE_REVEAL_MS = 4 * 60 * 1000

/** A quest's step 0 is no longer hidden behind its riddle. */
export function isRevealed(quest: Quest, now: number): boolean {
  if (!quest.riddle) return true
  if (quest.revealed) return true
  return now - quest.createdAt >= RIDDLE_REVEAL_MS
}

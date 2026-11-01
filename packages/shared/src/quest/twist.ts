import type { Quest } from './schema'

/**
 * Rewrite the final step once every earlier step is done. Idempotent: it runs
 * only while a twist exists and has not yet been applied (`replaced` unset).
 */
export function applyTwist(quest: Quest): Quest {
  const twist = quest.twist
  if (!twist || twist.replaced) return quest
  const last = quest.steps.length - 1
  if (last < 1) return quest
  // Every step before the last must be done.
  for (let i = 0; i < last; i++) if (!quest.progress[i]) return quest
  const steps = quest.steps.map((step) => ({ ...step }))
  const replaced = steps[last]
  if (!replaced) return quest
  steps[last] = { ...twist.step }
  return {
    ...quest,
    steps,
    twist: { ...twist, replaced },
  }
}

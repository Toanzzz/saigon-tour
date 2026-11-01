import type { Quest } from '@saigon/shared'
import { Store } from '@tanstack/store'
import { audio } from '@/shared/audio'
import { m } from '@/shared/i18n'
import { game, notify } from '@/shared/state/game'

/**
 * Watches `game` quests and announces a twist the first time a quest's
 * `twist.replaced` transitions from unset to set. Each quest fires at most once,
 * so a server replay of the same twisted quest never re-toasts. XR gets the
 * toast too; no extra UI. `twisted` exposes the most recent fire for widgets
 * (objective's "Plot twist" eyebrow) to react to.
 */
export interface TwistSignal {
  /** Quest id of the latest twist that fired, or null. */
  questId: string | null
  /** Monotonic counter so subscribers can detect repeat fires. */
  at: number
}

export const twistSignal = new Store<TwistSignal>({ questId: null, at: 0 })

/** Quest ids whose twist toast has already fired this journey. */
const fired = new Set<string>()

/** True once a quest's final step has been rewritten by its twist. */
function hasApplied(quest: Quest): boolean {
  return quest.twist?.replaced !== undefined
}

function announce(quest: Quest): void {
  const line = quest.twist?.line
  if (!line) return
  fired.add(quest.id)
  notify(m.twist_toast({ line }))
  audio.play('pickup')
  twistSignal.setState(() => ({ questId: quest.id, at: Date.now() }))
}

/** Subscribe to quest twists. Returns an unsubscribe function. */
export function installTwists(): () => void {
  // Seed from the current state so an already-applied twist does not re-fire.
  for (const quest of game.state.quests)
    if (hasApplied(quest)) fired.add(quest.id)
  const unsubscribe = game.subscribe((state) => {
    for (const quest of state.quests)
      if (hasApplied(quest) && !fired.has(quest.id)) announce(quest)
  })
  return unsubscribe.unsubscribe
}

/** Clear fired ids so restart()/tests start fresh. */
export function resetTwists(): void {
  fired.clear()
  twistSignal.setState(() => ({ questId: null, at: 0 }))
}

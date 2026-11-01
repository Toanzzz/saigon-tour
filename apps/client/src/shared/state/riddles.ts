import { isRevealed, type Quest, RIDDLE_REVEAL_MS } from '@saigon/shared'
import { audio } from '@/shared/audio'
import { m } from '@/shared/i18n'
import { game, notify } from '@/shared/state/game'
import { clock, startClock, stopClock } from '@/shared/state/ui'

/**
 * Watches quests plus the shared UI clock and announces a riddle reveal the
 * first time a quest's step 0 becomes revealed. Each quest fires once, so a
 * server replay never re-toasts. XR gets the toast too; no extra UI. While an
 * unrevealed riddle is active it keeps the 1 s clock ticking so the countdown
 * and the timed reveal fire without a visit or a connected room.
 */

/** Quest ids whose reveal toast has already fired this journey. */
const fired = new Set<string>()
/** True while the riddle store asked the shared clock to run. */
let holdingClock = false

function hasUnrevealed(quests: Quest[], now: number): boolean {
  return quests.some(
    (quest) => quest.riddle && !isRevealed(quest, now) && !quest.progress[0]
  )
}

function revealToast(quest: Quest): void {
  if (quest.revealed === 'solved') {
    notify(m.riddle_sharp_eye())
  } else if (quest.revealed === 'cyclo') {
    notify(m.riddle_revealed_cyclo())
  } else if (quest.revealed === 'talk') {
    notify(m.riddle_revealed_talk())
  } else {
    notify(m.riddle_revealed_time())
  }
  audio.play('pickup')
}

function check(now: number): void {
  const quests = game.state.quests
  for (const quest of quests) {
    if (!quest.riddle || fired.has(quest.id)) continue
    if (isRevealed(quest, now)) {
      fired.add(quest.id)
      revealToast(quest)
    }
  }
  // Keep the clock running only while a reveal is still pending.
  const pending = hasUnrevealed(quests, now)
  if (pending && !holdingClock) {
    holdingClock = true
    startClock()
  } else if (!pending && holdingClock) {
    holdingClock = false
    stopClock()
  }
}

/** Subscribe to reveals. Returns an unsubscribe function. */
export function installRiddles(): () => void {
  // Seed from current state so an already-revealed riddle does not re-fire.
  for (const quest of game.state.quests)
    if (quest.riddle && isRevealed(quest, clock.state.now)) fired.add(quest.id)
  check(clock.state.now)
  const offGame = game.subscribe(() => check(clock.state.now))
  const offClock = clock.subscribe((state) => check(state.now))
  return () => {
    offGame.unsubscribe()
    offClock.unsubscribe()
    if (holdingClock) {
      holdingClock = false
      stopClock()
    }
  }
}

/** Clear fired ids so restart()/tests start fresh. */
export function resetRiddles(): void {
  fired.clear()
  if (holdingClock) {
    holdingClock = false
    stopClock()
  }
}

/** Milliseconds until a riddle clears itself, floored at 0. */
export function riddleRemaining(quest: Quest, now: number): number {
  return Math.max(0, quest.createdAt + RIDDLE_REVEAL_MS - now)
}

/** The countdown as m:ss for the reveal options line. */
export function riddleClock(quest: Quest, now: number): string {
  const total = Math.ceil(riddleRemaining(quest, now) / 1000)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

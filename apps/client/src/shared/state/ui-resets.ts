import { resetVoice, resetVoiceClips } from '@/features/voice'
import { net } from '@/shared/api/status'
import { type GameState, game } from '@/shared/state/game'
import { resetNavigation } from '@/shared/state/navigation'
import {
  resetChatDraft,
  resetWardrobeTab,
  seedNameDraft,
  seedTransportForm,
  startClock,
  stopClock,
} from '@/shared/state/ui'

/**
 * One place that seeds transient UI stores on game transitions, replacing the
 * reset-on-mount effects that used to live in every panel. 0.11 `subscribe`
 * passes only the new value, so we keep the previous one here.
 */
export function installUiResets() {
  let prev: GameState = game.state
  const unsubscribe = game.subscribe((state) => {
    const was = prev
    prev = state
    if (
      state.screen !== 'playing' ||
      state.panel !== 'none' ||
      state.dialogue ||
      state.ride ||
      state.generation !== was.generation
    )
      resetNavigation()
    if (state.sessionId !== was.sessionId) resetVoiceClips()
    if (
      state.sessionId !== was.sessionId ||
      state.dialogue?.requestId !== was.dialogue?.requestId ||
      (state.dialogue?.thinking && !was.dialogue?.thinking) ||
      (state.screen !== 'playing' && was.screen === 'playing')
    )
      resetVoice()

    // Transport panel opened: fresh bus ride away from the current stop.
    if (state.panel === 'transport' && was.panel !== 'transport')
      seedTransportForm(state.stop)

    // Wardrobe opened: show all owned items.
    if (state.panel === 'wardrobe' && was.panel !== 'wardrobe')
      resetWardrobeTab()

    // New conversation or a switch to a different neighbor: clear the composer.
    const npc = state.dialogue?.npc ?? null
    const wasNpc = was.dialogue?.npc ?? null
    if (npc && npc !== wasNpc) resetChatDraft()

    // Rename surfaces (pause screen or settings panel): seed the name draft.
    const renameOpen = state.screen === 'paused' || state.panel === 'settings'
    const renameWasOpen = was.screen === 'paused' || was.panel === 'settings'
    if (renameOpen && !renameWasOpen) seedNameDraft(state.guestName)

    // Keep the draft in step when the saved name changes under us.
    if (state.guestName !== was.guestName) seedNameDraft(state.guestName)
  })
  return unsubscribe.unsubscribe
}

/** Run the shared 1 s clock only while the world room is full. */
export function installWaitingClock() {
  // Hold the shared clock across waiting transitions only, so the reference
  // count stays balanced with other holders (the riddle countdown).
  let holding = false
  const sync = (waiting: boolean) => {
    if (waiting && !holding) {
      holding = true
      startClock()
    } else if (!waiting && holding) {
      holding = false
      stopClock()
    }
  }
  sync(Boolean(net.state.waiting))
  const unsubscribe = net.subscribe((state) => sync(Boolean(state.waiting)))
  return () => {
    unsubscribe.unsubscribe()
    sync(false)
  }
}

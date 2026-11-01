import { Store } from '@tanstack/store'

/**
 * Frame-derived, React-visible view state. The per-frame simulation data stays
 * mutable (motion, input, presence sample maps); only the discrete values the
 * DOM reads live here, written on change by a single throttled ticker so the
 * frame loop never spams subscribers.
 */

export type PlayerAnimation = 'idle' | 'walk' | 'sprint'

/** Current player clip, written by the player frame loop when it changes. */
export const playerView = new Store<{ animation: PlayerAnimation }>({
  animation: 'idle',
})
export const setPlayerAnimation = (animation: PlayerAnimation) => {
  if (playerView.state.animation !== animation)
    playerView.setState(() => ({ animation }))
}
export const resetPlayerView = () =>
  playerView.setState(() => ({ animation: 'idle' }))

/** Touch joystick knob offset in px, written by the touch handlers. */
export const touchView = new Store<{ knob: [number, number] }>({
  knob: [0, 0],
})
export const setTouchKnob = (x: number, y: number) => {
  const [px, py] = touchView.state.knob
  if (px !== x || py !== y) touchView.setState(() => ({ knob: [x, y] }))
}
export const resetTouchKnob = () => touchView.setState(() => ({ knob: [0, 0] }))

export interface NpcLabelView {
  visible: boolean
  marker: string
  pulse: string
  at: number
}
/** Per-NPC world-label state, computed each frame by one ticker (NpcLabels). */
export const npcLabels = new Store<Record<string, NpcLabelView>>({})
const EMPTY_LABEL: NpcLabelView = {
  visible: false,
  marker: '',
  pulse: '',
  at: 0,
}
export const npcLabelOf = (id: string): NpcLabelView =>
  npcLabels.state[id] ?? EMPTY_LABEL
/** Replace the whole map only when some entry actually changed. */
export function writeNpcLabels(next: Record<string, NpcLabelView>) {
  const prev = npcLabels.state
  const keys = Object.keys(next)
  let changed = keys.length !== Object.keys(prev).length
  if (!changed)
    for (const key of keys) {
      const a = prev[key]
      const b = next[key]
      if (
        !a ||
        a.visible !== b.visible ||
        a.marker !== b.marker ||
        a.pulse !== b.pulse ||
        a.at !== b.at
      ) {
        changed = true
        break
      }
    }
  if (changed) npcLabels.setState(() => next)
}
export const resetNpcLabels = () => npcLabels.setState(() => ({}))

export function resetViewStores() {
  resetPlayerView()
  resetTouchKnob()
  resetNpcLabels()
}

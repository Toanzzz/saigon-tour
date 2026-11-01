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

export function resetViewStores() {
  resetPlayerView()
  resetTouchKnob()
}

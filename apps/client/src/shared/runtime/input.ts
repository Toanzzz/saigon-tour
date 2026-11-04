import { close, closeHub, interact, pause, toggleHub } from '@/app/actions'
import { net, updateNet } from '@/shared/api/status'
import { toggleVehicle } from '@/shared/api/wardrobe'
import { game, update } from '@/shared/state/game'
import { resetNavigation } from '@/shared/state/navigation'
import { resetTouchKnob } from '@/shared/state/view'
import { isXRPresenting } from '@/shared/xr/store'

export const input = { x: 0, z: 0, sprint: false, yaw: 0, dragging: false }
const keys = new Set<string>()
export function clearInput() {
  resetNavigation()
  keys.clear()
  input.x = 0
  input.z = 0
  input.sprint = false
  input.dragging = false
  // Recenter the touch stick knob (installed blur/visibility handlers call this).
  resetTouchKnob()
}
export function installInput() {
  const sync = () => {
    input.x =
      Number(keys.has('KeyD') || keys.has('ArrowRight')) -
      Number(keys.has('KeyA') || keys.has('ArrowLeft'))
    input.z =
      Number(keys.has('KeyS') || keys.has('ArrowDown')) -
      Number(keys.has('KeyW') || keys.has('ArrowUp'))
    input.sprint = keys.has('ShiftLeft') || keys.has('ShiftRight')
  }
  const down = (event: KeyboardEvent) => {
    // Escape is the single source of truth for closing overlays and toggling
    // pause. It must run even when a form control inside a dialog is focused,
    // so handle it before the typing early-return below.
    if (event.code === 'Escape') {
      // Consume the browser's dialog dismissal before changing store state.
      event.preventDefault()
      if (event.repeat) return
      clearInput()
      if (net.state.emotesOpen) updateNet({ emotesOpen: false })
      else if (game.state.screen === 'hub') closeHub()
      else if (game.state.panel !== 'none' || game.state.dialogue) close()
      else if (game.state.screen !== 'title') pause()
      return
    }
    if ((event.target as HTMLElement).matches('input,textarea,select')) return
    if (
      ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(
        event.code
      )
    )
      event.preventDefault()
    if (event.repeat) return
    keys.add(event.code)
    sync()
    if (input.x || input.z) resetNavigation()
    if (event.code === 'KeyE') interact()
    const canOpen =
      game.state.screen === 'playing' &&
      !game.state.dialogue &&
      !game.state.ride
    // The wardrobe is always reachable: riding, paused, and in the hub included.
    const canWardrobe =
      !game.state.dialogue &&
      (game.state.screen === 'playing' ||
        game.state.screen === 'paused' ||
        game.state.screen === 'hub')
    if (
      event.code === 'KeyH' &&
      (game.state.screen === 'hub' || (canOpen && game.state.panel === 'none'))
    )
      toggleHub()
    if (event.code === 'KeyJ' && canOpen)
      update({ panel: game.state.panel === 'journal' ? 'none' : 'journal' })
    if (event.code === 'KeyM' && canOpen)
      update({ panel: game.state.panel === 'map' ? 'none' : 'map' })
    if (event.code === 'KeyI' && canWardrobe)
      update({ panel: game.state.panel === 'wardrobe' ? 'none' : 'wardrobe' })
    if (event.code === 'KeyP' && canOpen && !isXRPresenting())
      update({ panel: game.state.panel === 'people' ? 'none' : 'people' })
    if (
      event.code === 'KeyQ' &&
      canOpen &&
      game.state.panel === 'none' &&
      !isXRPresenting()
    )
      updateNet({ emotesOpen: !net.state.emotesOpen })
    // Quick-ride: hop on/off the earned bike without opening the wardrobe.
    if (event.code === 'KeyB' && canOpen && game.state.panel === 'none')
      toggleVehicle()
  }
  const up = (event: KeyboardEvent) => {
    keys.delete(event.code)
    sync()
  }
  const visibility = () => {
    if (document.hidden) {
      clearInput()
      if (game.state.screen === 'playing') pause()
    }
  }
  window.addEventListener('keydown', down)
  window.addEventListener('keyup', up)
  window.addEventListener('blur', clearInput)
  document.addEventListener('visibilitychange', visibility)
  return () => {
    window.removeEventListener('keydown', down)
    window.removeEventListener('keyup', up)
    window.removeEventListener('blur', clearInput)
    document.removeEventListener('visibilitychange', visibility)
  }
}

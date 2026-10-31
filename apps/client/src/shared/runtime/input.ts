import { close, closeHub, interact, pause, toggleHub } from '@/app/actions'
import { net, updateNet } from '@/shared/api/status'
import { game, update } from '@/shared/state/game'
import { isXRPresenting } from '@/shared/xr/store'

export const input = { x: 0, z: 0, sprint: false, yaw: 0, dragging: false }
const keys = new Set<string>()
export function clearInput() {
  keys.clear()
  input.x = 0
  input.z = 0
  input.sprint = false
  input.dragging = false
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
    if (event.code === 'KeyE') interact()
    if (event.code === 'Escape') {
      clearInput()
      if (net.state.emotesOpen) updateNet({ emotesOpen: false })
      else if (game.state.screen === 'hub') closeHub()
      else if (game.state.panel !== 'none' || game.state.dialogue) close()
      else if (game.state.screen !== 'title') pause()
    }
    const canOpen =
      game.state.screen === 'playing' &&
      !game.state.dialogue &&
      !game.state.ride
    if (
      event.code === 'KeyH' &&
      (game.state.screen === 'hub' || (canOpen && game.state.panel === 'none'))
    )
      toggleHub()
    if (event.code === 'KeyJ' && canOpen)
      update({ panel: game.state.panel === 'journal' ? 'none' : 'journal' })
    if (event.code === 'KeyM' && canOpen)
      update({ panel: game.state.panel === 'map' ? 'none' : 'map' })
    if (event.code === 'KeyP' && canOpen && !isXRPresenting())
      update({ panel: game.state.panel === 'people' ? 'none' : 'people' })
    if (
      event.code === 'KeyQ' &&
      canOpen &&
      game.state.panel === 'none' &&
      !isXRPresenting()
    )
      updateNet({ emotesOpen: !net.state.emotesOpen })
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

import { useThree } from '@react-three/fiber'
import type { NpcId } from '@saigon/shared'
import { useEffect } from 'react'
import { Raycaster, Vector2 } from 'three'
import { input } from '@/shared/runtime/input'
import { game } from '@/shared/state/game'
import { isXRPresenting } from '@/shared/xr/store'
import { navigateToNpc, navigateToPoint } from './navigation'

/** Mouse navigation and camera drag share one gesture owner. */
export function MouseControls() {
  const { gl, camera, scene } = useThree()
  useEffect(() => {
    const canvas = gl.domElement
    const ray = new Raycaster()
    const pointer = new Vector2()
    let gesture: {
      id: number
      x: number
      y: number
      lastX: number
      mouse: boolean
      button: number
      dragged: boolean
    } | null = null
    const enabled = () => {
      const state = game.state
      return (
        state.screen === 'playing' &&
        !state.dialogue &&
        state.panel === 'none' &&
        !state.ride &&
        !isXRPresenting()
      )
    }
    const down = (event: PointerEvent) => {
      if (!enabled() || gesture || (event.button !== 0 && event.button !== 2))
        return
      gesture = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        lastX: event.clientX,
        mouse: event.pointerType === 'mouse',
        button: event.button,
        dragged: false,
      }
      canvas.setPointerCapture(event.pointerId)
    }
    const move = (event: PointerEvent) => {
      if (!gesture || event.pointerId !== gesture.id) return
      gesture.dragged ||=
        Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) >= 6
      if (enabled() && gesture.dragged) {
        input.yaw -= (event.clientX - gesture.lastX) * 0.007
        input.dragging = true
      }
      gesture.lastX = event.clientX
    }
    const cancel = () => {
      gesture = null
      input.dragging = false
    }
    const up = (event: PointerEvent) => {
      const current = gesture
      cancel()
      if (canvas.hasPointerCapture(event.pointerId))
        canvas.releasePointerCapture(event.pointerId)
      if (
        !current ||
        current.id !== event.pointerId ||
        !current.mouse ||
        current.button !== 0 ||
        current.dragged ||
        !enabled()
      )
        return
      const rect = canvas.getBoundingClientRect()
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        (-(event.clientY - rect.top) / rect.height) * 2 + 1
      )
      ray.setFromCamera(pointer, camera)
      for (const hit of ray.intersectObjects(scene.children, true)) {
        let object = hit.object
        if (!object.visible || hit.object.userData.navigationMarker) continue
        let npc: NpcId | undefined
        let hidden = false
        while (object) {
          hidden ||= !object.visible
          npc ??= object.userData.npcId
          if (!object.parent) break
          object = object.parent
        }
        if (hidden) continue
        if (npc) {
          navigateToNpc(npc)
          return
        }
        // Only low horizontal surfaces are walkable; scenery occludes them.
        if (hit.point.y < 0.3) navigateToPoint([hit.point.x, 0.9, hit.point.z])
        return
      }
    }
    const context = (event: MouseEvent) => event.preventDefault()
    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', up)
    canvas.addEventListener('pointercancel', cancel)
    canvas.addEventListener('lostpointercapture', cancel)
    canvas.addEventListener('contextmenu', context)
    window.addEventListener('blur', cancel)
    return () => {
      cancel()
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up)
      canvas.removeEventListener('pointercancel', cancel)
      canvas.removeEventListener('lostpointercapture', cancel)
      canvas.removeEventListener('contextmenu', context)
      window.removeEventListener('blur', cancel)
    }
  }, [gl, camera, scene])
  return null
}

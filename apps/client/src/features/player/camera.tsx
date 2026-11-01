import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { Vector3 } from 'three'
import { input } from '@/shared/runtime/input'
import { motion } from '@/shared/runtime/motion'
import { game } from '@/shared/state/game'

export function CameraRig() {
  const { camera, gl, size } = useThree()
  const target = useMemo(() => new Vector3(), [])
  const eye = useMemo(() => new Vector3(), [])
  useEffect(() => {
    const canvas = gl.domElement
    let lastX = 0
    const down = (event: PointerEvent) => {
      if (game.state.screen !== 'playing') return
      input.dragging = true
      lastX = event.clientX
      canvas.setPointerCapture(event.pointerId)
    }
    const move = (event: PointerEvent) => {
      if (!input.dragging) return
      input.yaw -= (event.clientX - lastX) * 0.007
      lastX = event.clientX
    }
    const up = () => {
      input.dragging = false
    }
    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', up)
    canvas.addEventListener('pointercancel', up)
    canvas.addEventListener('lostpointercapture', up)
    return () => {
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up)
      canvas.removeEventListener('pointercancel', up)
      canvas.removeEventListener('lostpointercapture', up)
    }
  }, [gl])
  useFrame((_, delta) => {
    if (gl.xr.isPresenting) return
    const state = game.state
    if (state.viewpoint === 'river') {
      eye.set(29, 27, 69)
      target.set(29, 3.5, 36)
    } else if (state.screen === 'title') {
      eye.set(14, 32, 39)
      target.set(-17, 0, -10)
    } else {
      const mobile = size.width < 700
      const mounted = state.unlocks.equipped.vehicle ? 3 : 0
      const distance = (mobile ? 18 : 16) + mounted
      target.copy(motion.position).add(new Vector3(0, 0.7, 0))
      eye
        .set(
          Math.sin(input.yaw) * distance,
          mobile ? 26 : 24,
          Math.cos(input.yaw) * distance
        )
        .add(target)
    }
    camera.position.lerp(
      eye,
      state.reducedMotion ? 1 : 1 - Math.exp(-5 * Math.min(delta, 0.1))
    )
    camera.lookAt(target)
  })
  return null
}

import { useFrame, useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import { type PerspectiveCamera, Vector3 } from 'three'
import { input } from '@/shared/runtime/input'
import { motion } from '@/shared/runtime/motion'
import { game } from '@/shared/state/game'

/** Long lens for the title diorama shot and the regular play field of view. */
export const TITLE_FOV = 22
export const MOBILE_TITLE_FOV = 44
export const PLAY_FOV = 49

/** The title fits the market to each viewport; gameplay uses its regular lens. */
export function lensFor(screen: string, mobile = false): number {
  return screen === 'title' ? (mobile ? MOBILE_TITLE_FOV : TITLE_FOV) : PLAY_FOV
}

/** The active scene camera, exposed read-only to the `camera()` test hook. */
let activeCamera: PerspectiveCamera | null = null

/** Read-only snapshot of the current camera: fov, position and yaw. */
export function cameraSnapshot(): {
  fov: number
  position: [number, number, number]
  yaw: number
} | null {
  if (!activeCamera) return null
  const { x, y, z } = activeCamera.position
  return { fov: activeCamera.fov, position: [x, y, z], yaw: input.yaw }
}

export function CameraRig() {
  const { camera, gl, size } = useThree()
  activeCamera = camera as PerspectiveCamera
  const target = useMemo(() => new Vector3(), [])
  const eye = useMemo(() => new Vector3(), [])
  useFrame((_, delta) => {
    if (gl.xr.isPresenting) return
    const state = game.state
    if (state.viewpoint === 'river') {
      eye.set(29, 27, 69)
      target.set(29, 3.5, 36)
    } else if (state.screen === 'title') {
      // Leave the desktop copy on the left; show the gate and roof on the right.
      // Portrait screens keep the market above the bottom-aligned title form.
      if (size.width < 700) {
        target.set(-23, 4, -12)
        eye.set(2, 49, 53)
      } else {
        target.set(-31, 4, -6)
        eye.set(7, 52, 64)
      }
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
    // Portrait titles shift the landmark above the form; gameplay recenters.
    const lens = camera as PerspectiveCamera
    const mobileTitle = state.screen === 'title' && size.width < 700
    const fov = lensFor(state.screen, size.width < 700)
    if (
      mobileTitle &&
      (!lens.view?.enabled ||
        lens.view.fullWidth !== size.width ||
        lens.view.fullHeight !== size.height)
    ) {
      lens.setViewOffset(
        size.width,
        size.height,
        0,
        size.height * 0.34,
        size.width,
        size.height
      )
    } else if (!mobileTitle && lens.view?.enabled) {
      lens.clearViewOffset()
    }
    if (lens.fov !== fov) {
      lens.fov = fov
      lens.updateProjectionMatrix()
    }
  })
  return null
}

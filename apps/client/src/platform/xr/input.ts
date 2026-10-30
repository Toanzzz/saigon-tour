import { useFrame, useThree } from '@react-three/fiber'
import { useXR, useXRInputSourceStates } from '@react-three/xr'
import { type RefObject, useEffect, useRef } from 'react'
import { type Group, Vector3 } from 'three'
import { input } from '../../core/input'
import { motion } from '../../core/motion'
import { game } from '../../state/game'

const DEAD_ZONE = 0.16
const SNAP_THRESHOLD = 0.58
const SNAP_RELEASE = 0.24
const SNAP_ANGLE = Math.PI / 4
const forward = new Vector3()
type InputState = ReturnType<typeof useXRInputSourceStates>[number]
type ControllerState = Extract<InputState, { type: 'controller' }>

function stick(state: ControllerState | undefined): { x: number; y: number } {
  const value = state?.gamepad['xr-standard-thumbstick']
  return { x: value?.xAxis ?? 0, y: value?.yAxis ?? 0 }
}

function applyDeadZone(value: number): number {
  if (Math.abs(value) <= DEAD_ZONE) return 0
  const sign = Math.sign(value)
  return sign * ((Math.abs(value) - DEAD_ZONE) / (1 - DEAD_ZONE))
}

function byHand(
  states: readonly InputState[],
  handedness: XRHandedness
): ControllerState | undefined {
  return states.find(
    (state): state is ControllerState =>
      state.type === 'controller' && state.inputSource.handedness === handedness
  )
}

export function XRInput({ originRef }: { originRef: RefObject<Group | null> }) {
  const states = useXRInputSourceStates()
  const session = useXR((state) => state.session)
  const camera = useThree((state) => state.camera)
  const snapLocked = useRef(false)
  useEffect(() => {
    if (session) return
    input.x = 0
    input.z = 0
    input.sprint = false
    snapLocked.current = false
  }, [session])
  useFrame(() => {
    if (!session || !originRef.current) return
    const active = game.state
    const canMove =
      active.screen === 'playing' &&
      active.panel === 'none' &&
      active.dialogue === null &&
      active.ride === null
    const left = stick(byHand(states, 'left'))
    const right = stick(byHand(states, 'right'))
    if (canMove) {
      input.x = applyDeadZone(left.x)
      input.z = applyDeadZone(left.y)
      input.sprint = false
      camera.getWorldDirection(forward)
      forward.y = 0
      if (forward.lengthSq() > 0.001)
        input.yaw = Math.atan2(forward.x, forward.z)
    } else {
      input.x = 0
      input.z = 0
      input.sprint = false
    }
    const amount = Math.abs(right.x)
    if (amount < SNAP_RELEASE) snapLocked.current = false
    if (canMove && amount >= SNAP_THRESHOLD && !snapLocked.current) {
      originRef.current.rotation.y -= Math.sign(right.x) * SNAP_ANGLE
      snapLocked.current = true
    }
    originRef.current.position.set(motion.position.x, 0, motion.position.z)
  })
  return null
}

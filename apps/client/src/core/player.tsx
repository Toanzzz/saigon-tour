import { useFrame, useThree } from '@react-three/fiber'
import {
  CapsuleCollider,
  type RapierRigidBody,
  RigidBody,
} from '@react-three/rapier'
import { useStore } from '@tanstack/react-store'
import { useEffect, useRef, useState } from 'react'
import { type Group, Vector3 } from 'three'
import { game, update } from '../state/game'
import { Character } from '../world'
import { input } from './input'
import { motion } from './motion'
import { distance, PLACES, type Point, SPAWN } from './places'
import { isTestPausedForScreenshot } from './test-hooks'

const velocity = new Vector3()
const up = new Vector3(0, 1, 0)
export function Player() {
  const { gl } = useThree()
  const riding = useStore(game, (s) => s.ride !== null)
  const body = useRef<RapierRigidBody>(null)
  const avatar = useRef<Group>(null)
  const [animation, setAnimation] = useState('idle')
  const timer = useRef(0)
  useEffect(() => {
    const position = game.state.position
    motion.position.set(...position)
    input.yaw = 0
    body.current?.setTranslation(motion.position, true)
    body.current?.setLinvel({ x: 0, y: 0, z: 0 }, true)
  }, [])
  useEffect(() => {
    body.current?.setEnabled(!riding)
    if (!riding) {
      body.current?.setTranslation(motion.position, true)
      body.current?.setLinvel({ x: 0, y: 0, z: 0 }, true)
    }
  }, [riding])
  useFrame((_, delta) => {
    const state = game.state
    if (avatar.current) avatar.current.visible = !riding && !gl.xr.isPresenting
    motion.frames++
    motion.dt += (delta - motion.dt) * 0.05
    if (isTestPausedForScreenshot()) return
    if (!body.current || state.ride) return
    const enabled =
      state.screen === 'playing' && !state.dialogue && state.panel === 'none'
    const x = enabled ? input.x : 0
    const z = enabled ? input.z : 0
    const moving = Math.hypot(x, z) > 0.1
    const speed = input.sprint ? 6.5 : 4
    velocity
      .set(x, 0, z)
      .clampLength(0, 1)
      .applyAxisAngle(up, input.yaw)
      .multiplyScalar(speed)
    const old = body.current.linvel()
    const smoothing = 1 - Math.exp(-20 * Math.min(delta, 0.1))
    body.current.setLinvel(
      {
        x: old.x + (velocity.x - old.x) * smoothing,
        y: old.y,
        z: old.z + (velocity.z - old.z) * smoothing,
      },
      true
    )
    const pos = body.current.translation()
    motion.position.set(pos.x, pos.y, pos.z)
    motion.moving = moving
    motion.sprinting = moving && input.sprint
    if (moving) motion.heading = Math.atan2(velocity.x, velocity.z)
    if (avatar.current) avatar.current.rotation.y = motion.heading
    const next = moving ? (input.sprint ? 'sprint' : 'walk') : 'idle'
    if (next !== animation) setAnimation(next)
    timer.current += delta
    if (timer.current > 0.1) {
      timer.current = 0
      const position: Point = [pos.x, pos.y, pos.z]
      const place = (Object.keys(PLACES) as (keyof typeof PLACES)[]).find(
        (key) => distance(position, PLACES[key].at) < 10
      )
      update({
        position,
        world: place
          ? {
              ...state.world,
              locationId: place,
              visitedLocations: [
                ...new Set([...state.world.visitedLocations, place]),
              ],
            }
          : state.world,
      })
    }
  })
  return (
    <RigidBody
      ref={body}
      position={SPAWN}
      colliders={false}
      enabledRotations={[false, false, false]}
      friction={0}
      restitution={0}
      linearDamping={0}
      canSleep={false}
      ccd
    >
      <CapsuleCollider args={[0.45, 0.35]} />
      <group ref={avatar} visible={!riding} position={[0, -0.8, 0]}>
        <Character model="male-b" animation={animation} />
      </group>
    </RigidBody>
  )
}

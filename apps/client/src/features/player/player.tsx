import { useFrame, useThree } from '@react-three/fiber'
import {
  CapsuleCollider,
  type RapierRigidBody,
  RigidBody,
} from '@react-three/rapier'
import { UNLOCKS } from '@saigon/shared'
import { useSelector } from '@tanstack/react-store'
import { useEffect, useRef } from 'react'
import { type Group, Vector3 } from 'three'
import { isTestPausedForScreenshot } from '@/app/test-hooks'
import {
  CarriedCake,
  carriedFragile,
  resetCarryRuntime,
  stepFootCarry,
} from '@/features/carry'
import { Pet } from '@/features/pets'
import { arriveAside } from '@/features/transport/asides'
import { input } from '@/shared/runtime/input'
import { motion } from '@/shared/runtime/motion'
import { game, update, visit } from '@/shared/state/game'
import { playerView, setPlayerAnimation } from '@/shared/state/view'
import { Avatar, PersonalVehicle } from '@/shared/world'
import { distance, PLACES, type Point, SPAWN } from '@/shared/world/places'
import { riderPosition } from '@/shared/world/vehicles'

const velocity = new Vector3()
const up = new Vector3(0, 1, 0)
export function Player() {
  const { gl } = useThree()
  const riding = useSelector(game, (s) => s.ride !== null)
  const equipped = useSelector(game, (s) => s.unlocks.equipped)
  const avatarBody = useSelector(game, (s) => s.body)
  const vehicle = equipped.vehicle ?? null
  const pet = equipped.pet ?? null
  const body = useRef<RapierRigidBody>(null)
  const avatar = useRef<Group>(null)
  const animation = useSelector(playerView, (v) => v.animation)
  const carrying = useSelector(game, (s) => carriedFragile(s) !== null)
  const timer = useRef(0)
  const wasCarrying = useRef(carrying)
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
    if (motion.teleport) {
      const [tx, tz] = motion.teleport
      motion.teleport = null
      body.current.setTranslation({ x: tx, y: 0.9, z: tz }, true)
      body.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
      motion.position.set(tx, 0.9, tz)
      update({ position: [tx, 0.9, tz] })
      return
    }
    const enabled =
      state.screen === 'playing' && !state.dialogue && state.panel === 'none'
    const x = enabled ? input.x : 0
    const z = enabled ? input.z : 0
    const moving = Math.hypot(x, z) > 0.1
    const speed = vehicle
      ? (UNLOCKS[vehicle]?.speed ?? 4)
      : input.sprint
        ? 6.5
        : 4
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
    const holding = carriedFragile(state) !== null
    if (holding !== wasCarrying.current) {
      wasCarrying.current = holding
      if (holding) resetCarryRuntime()
    }
    stepFootCarry(delta, holding && moving)
    const next = moving ? (input.sprint ? 'sprint' : 'walk') : 'idle'
    setPlayerAnimation(next)
    timer.current += delta
    if (timer.current > 0.1) {
      timer.current = 0
      const position: Point = [pos.x, pos.y, pos.z]
      const place = (Object.keys(PLACES) as (keyof typeof PLACES)[]).find(
        (key) => distance(position, PLACES[key].at) < 10
      )
      // A walk into a new place earns a narrator aside (throttled in asides.ts).
      if (place && !state.ride && place !== state.world.locationId)
        arriveAside(
          'walk',
          distance(PLACES[state.stop].at, PLACES[place].at),
          place
        )
      update({ position, ...(place ? visit(state, place) : {}) })
    }
  })
  return (
    <>
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
          <Avatar
            body={avatarBody}
            animation={vehicle ? 'drive' : animation}
            position={vehicle ? riderPosition(vehicle) : undefined}
            look={equipped}
          />
          {carrying && !riding && !gl.xr.isPresenting && <CarriedCake />}
          {vehicle && !riding && <PersonalVehicle id={vehicle} />}
        </group>
      </RigidBody>
      {pet && !riding && (
        <Pet
          id={pet}
          target={() => [motion.position.x, 0, motion.position.z]}
          heading={() => motion.heading}
        />
      )}
    </>
  )
}

import { useFrame } from '@react-three/fiber'
import { useSelector } from '@tanstack/react-store'
import { useMemo, useRef } from 'react'
import { type Group, Vector3 } from 'three'
import { isTestPausedForScreenshot } from '@/app/test-hooks'
import { audio } from '@/shared/audio'
import { motion } from '@/shared/runtime/motion'
import { game, notify, update, visit } from '@/shared/state/game'
import { Character, Vehicle } from '@/shared/world'
import { MODES, PLACES } from '@/shared/world/places'
import { route } from './routes'

export function Transport() {
  const ride = useSelector(game, (s) => s.ride)
  const vehicle = useRef<Group>(null)
  const progress = useRef(0)
  const lastUpdate = useRef(0)
  const from = ride?.from
  const to = ride?.to
  const path = useMemo(() => {
    progress.current = 0
    if (!from || !to) return []
    return route(from, to, ride?.mode === 'metro' ? 'metro' : 'bus').map(
      (point) => new Vector3(...point)
    )
  }, [from, to, ride?.mode])
  useFrame((_, delta) => {
    if (
      isTestPausedForScreenshot() ||
      !ride ||
      !vehicle.current ||
      game.state.screen !== 'playing'
    )
      return
    const length = path
      .slice(1)
      .reduce((sum, p, index) => sum + p.distanceTo(path[index]), 0)
    progress.current = Math.min(
      length,
      progress.current + Math.min(delta, 0.05) * MODES[ride.mode].speed
    )
    let remaining = progress.current
    for (let index = 1; index < path.length; index++) {
      const start = path[index - 1]
      const end = path[index]
      const part = end.distanceTo(start)
      if (remaining <= part || index === path.length - 1) {
        vehicle.current.position
          .copy(start)
          .lerp(end, Math.min(1, remaining / part))
        vehicle.current.rotation.y = Math.atan2(
          end.x - start.x,
          end.z - start.z
        )
        motion.position
          .copy(vehicle.current.position)
          .add(new Vector3(0, 0.9, 0))
        motion.heading = vehicle.current.rotation.y
        break
      }
      remaining -= part
    }
    lastUpdate.current += delta
    if (lastUpdate.current > 0.1) {
      lastUpdate.current = 0
      update({
        position: [motion.position.x, motion.position.y, motion.position.z],
        ride: { ...ride, progress: progress.current / length },
      })
    }
    if (progress.current >= length) {
      const stop = PLACES[ride.to].stop
      motion.position.set(stop[0] + 1.8, 0.9, stop[2])
      update({
        ride: null,
        position: [motion.position.x, 0.9, motion.position.z],
        stop: ride.to,
        ...visit(game.state, ride.to),
      })
      audio.play('arrive')
      notify(`Welcome to ${PLACES[ride.to].name}`)
    }
  })
  return (
    <>
      {!ride && (
        <Vehicle
          mode="bus"
          position={[-10, 0, 12]}
          rotation={[0, Math.PI / 2, 0]}
        />
      )}
      <Vehicle mode="cyclo" position={[26, 0, 30]} rotation={[0, -0.5, 0]} />
      <Vehicle mode="xeom" position={[-11.5, 0, 8]} rotation={[0, 0.8, 0]} />
      {ride && (
        <group ref={vehicle}>
          <Vehicle mode={ride.mode} />
          {(ride.mode === 'xeom' || ride.mode === 'cyclo') && (
            <Character
              model="male-b"
              position={[0, 0.7, -0.3]}
              animation="sit"
              scale={2.2}
            />
          )}
        </group>
      )}
    </>
  )
}

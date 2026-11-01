import { Sparkles } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { COIN_PICKUPS, type CoinPickup } from '@saigon/shared'
import { useSelector } from '@tanstack/react-store'
import { useRef } from 'react'
import type { Group } from 'three'
import { isTestPausedForScreenshot } from '@/app/test-hooks'
import { motion } from '@/shared/runtime/motion'
import { game } from '@/shared/state/game'
import { Model } from '@/shared/world'
import {
  COLLECT_EFFECT_SECONDS,
  collectCoin,
  collectedCoins,
  collectingCoins,
  finishCollecting,
} from './pickup'

/** Distance (world units) at which walking into a coin collects it. */
const PICKUP_RANGE = 1.4
/** Float height of the coin above the ground. */
const COIN_Y = 0.9

/** An idle, spinning, bobbing coin that collects on player proximity. */
function WorldCoin({ coin }: { coin: CoinPickup }) {
  const group = useRef<Group>(null)
  const [x, z] = coin.at
  useFrame((state, delta) => {
    if (!group.current || isTestPausedForScreenshot()) return
    group.current.rotation.y += 1.6 * delta
    group.current.position.y = COIN_Y + Math.sin(performance.now() / 500) * 0.08
    if (game.state.screen !== 'playing') return
    const dx = motion.position.x - x
    const dz = motion.position.z - z
    if (dx * dx + dz * dz < PICKUP_RANGE * PICKUP_RANGE)
      void collectCoin(coin.id, state.clock.elapsedTime)
  })
  return (
    <group ref={group} position={[x, COIN_Y, z]}>
      <Model path="collectibles/coin" scale={1.1} shadow={false} />
    </group>
  )
}

/**
 * A just-collected coin playing its ~0.5 s exit: a quick pop (scale 1 → 1.6 →
 * 0) with a lift and a faster spin, plus a one-shot gold sparkle burst. Removed
 * from the renderer once the window elapses. Transform-only, so it never mutates
 * the shared cached coin material.
 */
function CollectingCoin({ coin, start }: { coin: CoinPickup; start: number }) {
  const group = useRef<Group>(null)
  const [x, z] = coin.at
  useFrame((state) => {
    if (!group.current) return
    const t = (state.clock.elapsedTime - start) / COLLECT_EFFECT_SECONDS
    if (t >= 1) {
      finishCollecting(coin.id)
      return
    }
    // Pop out then shrink to nothing; ease the lift with a slight overshoot.
    const pop = t < 0.3 ? 1 + (t / 0.3) * 0.6 : 1.6 * (1 - (t - 0.3) / 0.7)
    group.current.scale.setScalar(Math.max(0, 1.1 * pop))
    group.current.position.y = COIN_Y + t * 0.6
    group.current.rotation.y += 0.3
  })
  return (
    <group ref={group} position={[x, COIN_Y, z]}>
      <Model path="collectibles/coin" scale={1.1} shadow={false} />
      <Sparkles
        count={14}
        scale={0.9}
        size={4}
        speed={0.6}
        color="#ffd21a"
        noise={1}
      />
    </group>
  )
}

/** Ambient collectible coins placed along the District 1 walkways. Collecting
 * one grants currency through the server pickup route and plays a short collect
 * effect; the flat HUD glyph and economy are unchanged. */
export function Coins() {
  const collected = useSelector(collectedCoins, (set) => set)
  const collecting = useSelector(collectingCoins, (map) => map)
  return (
    <>
      {COIN_PICKUPS.filter((coin) => !collected.has(coin.id)).map((coin) => (
        <WorldCoin key={coin.id} coin={coin} />
      ))}
      {COIN_PICKUPS.filter((coin) => collecting.has(coin.id)).map((coin) => (
        <CollectingCoin
          key={`fx-${coin.id}`}
          coin={coin}
          start={collecting.get(coin.id) as number}
        />
      ))}
    </>
  )
}

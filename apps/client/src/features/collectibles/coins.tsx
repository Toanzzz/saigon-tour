import { useFrame } from '@react-three/fiber'
import { COIN_PICKUPS, type CoinPickup } from '@saigon/shared'
import { useSelector } from '@tanstack/react-store'
import { useRef } from 'react'
import type { Group } from 'three'
import { isTestPausedForScreenshot } from '@/app/test-hooks'
import { motion } from '@/shared/runtime/motion'
import { game } from '@/shared/state/game'
import { Model } from '@/shared/world'
import { collectCoin, collectedCoins } from './pickup'

/** Distance (world units) at which walking into a coin collects it. */
const PICKUP_RANGE = 1.4
/** Float height of the coin above the ground. */
const COIN_Y = 0.9

function WorldCoin({ coin }: { coin: CoinPickup }) {
  const group = useRef<Group>(null)
  const [x, z] = coin.at
  useFrame((_, delta) => {
    if (!group.current || isTestPausedForScreenshot()) return
    group.current.rotation.y += 1.6 * delta
    group.current.position.y = COIN_Y + Math.sin(performance.now() / 500) * 0.08
    if (game.state.screen !== 'playing') return
    const dx = motion.position.x - x
    const dz = motion.position.z - z
    if (dx * dx + dz * dz < PICKUP_RANGE * PICKUP_RANGE)
      void collectCoin(coin.id)
  })
  return (
    <group ref={group} position={[x, COIN_Y, z]}>
      <Model path="collectibles/coin" scale={1.1} shadow={false} />
    </group>
  )
}

/** Ambient collectible coins placed along the District 1 walkways. Collecting
 * one grants currency through the server pickup route; the flat HUD glyph and
 * economy are unchanged. */
export function Coins() {
  const collected = useSelector(collectedCoins, (set) => set)
  return (
    <>
      {COIN_PICKUPS.filter((coin) => !collected.has(coin.id)).map((coin) => (
        <WorldCoin key={coin.id} coin={coin} />
      ))}
    </>
  )
}

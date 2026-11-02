import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group } from 'three'
import { game } from '@/shared/state/game'
import type { Placement, Vec3 } from './assets'
import { Nearby } from './nearby'
import { Blocks } from './primitives'
import {
  assemble,
  PropBlocks,
  STOOL_PARTS,
  type StreetPlacement,
} from './street-life-kit'

/**
 * Exaggerated Bến Thành clock tower on the market's south gate (world +z).
 * The GLB (`landmarks/cho-ben-thanh`) has no grouped tower node — its clock
 * parts are flat sibling meshes — so per the plan this is a procedural tower
 * reusing the cultural-parts clock dial look. The tower sits inside the MARKET
 * footprint (z ≈ −4, MARKET ends at z −2), so no solid changes.
 */

const STONE = '#ecd8ae'
const TRIM = '#c8643f'
const ROOF = '#9a4a33'

/** The tower column + clock stage + spire; hands tick on the TickingHands. */
export function MarketClockTower() {
  // Market model centre is (−23, −12); the south gate faces +z.
  const baseX = -23
  const baseZ = -3.4
  const baseY = 10.2 // top of the market roof
  return (
    <group position={[baseX, baseY, baseZ]}>
      {/* Shaft + clock stage, one STONE batch. */}
      <Blocks
        color={STONE}
        shadow
        placements={[
          { position: [0, 3, 0], scale: [4.2, 6, 3.2] },
          { position: [0, 7.4, 0], scale: [3.4, 3.4, 2.6] },
        ]}
      />
      {/* Cornice bands + spire finial, one TRIM batch. */}
      <Blocks
        color={TRIM}
        placements={[
          { position: [0, 0, 0], scale: [4.6, 0.5, 3.6] },
          { position: [0, 6, 0], scale: [4.6, 0.5, 3.6] },
          { position: [0, 12.7, 0], scale: [0.22, 1.4, 0.22] },
        ]}
      />
      {/* Pyramidal roof tiers, one ROOF batch. */}
      <Blocks
        color={ROOF}
        placements={[
          { position: [0, 9.6, 0], scale: [3.8, 0.5, 3] },
          { position: [0, 10.5, 0], scale: [2.4, 1.4, 1.9] },
          { position: [0, 11.6, 0], scale: [1.1, 1.1, 0.9] },
        ]}
      />
      {/* One clock on the +z plaza face; the hands tick. */}
      <group position={[0, 8.2, 1.33]} scale={1.55}>
        <TickingHands />
      </group>
    </group>
  )
}

/**
 * A clock dial (the cultural-parts look) plus two hands that advance each
 * frame. Reduced motion freezes the hands (test hook `setReducedMotion`).
 */
function TickingHands({ position = [0, 0, 0] as Vec3 }) {
  const hour = useRef<Group>(null)
  const minute = useRef<Group>(null)
  useFrame(() => {
    if (game.state.reducedMotion) return
    // One in-game minute per real second keeps the tick visible but gentle.
    const minutes = Date.now() / 1000
    if (minute.current)
      minute.current.rotation.z = -(minutes % 60) * (Math.PI / 30)
    if (hour.current)
      hour.current.rotation.z = -((minutes / 60) % 12) * (Math.PI / 6)
  })
  return (
    <group position={position}>
      {/* Dial face + bezel + hour ticks (the cultural-parts clock look). */}
      <mesh>
        <circleGeometry args={[0.53, 24]} />
        <meshStandardMaterial color="#fff1cd" roughness={0.85} />
      </mesh>
      <Blocks
        color="#66563f"
        placements={Array.from({ length: 12 }, (_, tick) => {
          const angle = (tick * Math.PI) / 6
          return {
            position: [Math.sin(angle) * 0.4, Math.cos(angle) * 0.4, 0.03],
            rotation: [0, 0, -angle],
            scale: [0.035, 0.09, 0.025],
          }
        })}
      />
      <group ref={hour}>
        <mesh position={[0, 0.13, 0.05]}>
          <boxGeometry args={[0.05, 0.28, 0.03]} />
          <meshStandardMaterial color="#2b2230" />
        </mesh>
      </group>
      <group ref={minute}>
        <mesh position={[0, 0.19, 0.06]}>
          <boxGeometry args={[0.035, 0.4, 0.03]} />
          <meshStandardMaterial color="#2b2230" />
        </mesh>
      </group>
    </group>
  )
}

/**
 * Market spill-over: extra red stools and umbrella stalls along the west and
 * east MARKET frontages (x ≈ ±edge, z −16..−6), clear of spawn (−23, 10) and
 * the market NPC anchors, which all sit on the +z gate side (z ≥ 3.5). Reuses
 * the street-life kit; these are low dressing props without colliders.
 */
const spillStalls: StreetPlacement[] = [
  { x: -37, z: -11 },
  { x: -9, z: -11 },
]
const spillStools = spillStalls.flatMap((s) =>
  [-1.2, 1.2].map((dz) => ({ x: s.x, z: s.z + dz }))
)
const spillBatches = assemble([{ positions: spillStools, parts: STOOL_PARTS }])

const parasolPosts: Placement[] = spillStalls.map((s) => ({
  position: [s.x, 1.1, s.z],
  scale: [0.1, 2.2, 0.1],
}))

export function MarketSpillover() {
  // MARKET centre ≈ (−23, −12); cull the low dressing from afar. Below 700px
  // the mobile budget is tighter, so keep the batched stools and drop the
  // parasol posts + umbrella canopies.
  const mobile = useThree((state) => state.size.width) < 700
  return (
    <Nearby at={[-23, -12]} distance={55}>
      <group name="market-spillover">
        <PropBlocks batches={spillBatches} />
        {!mobile && (
          <>
            <Blocks color="#445c53" placements={parasolPosts} />
            {/* Flat umbrella canopies, one batched draw. */}
            <Blocks
              color="#d7623f"
              placements={spillStalls.map((s) => ({
                position: [s.x, 2.3, s.z],
                scale: [2.8, 0.3, 2.8],
              }))}
            />
          </>
        )}
      </group>
    </Nearby>
  )
}

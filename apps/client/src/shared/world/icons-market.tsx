import { useThree } from '@react-three/fiber'
import type { Placement } from './assets'
import { Nearby } from './nearby'
import { Blocks } from './primitives'
import {
  assemble,
  PropBlocks,
  STOOL_PARTS,
  type StreetPlacement,
} from './street-life-kit'

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

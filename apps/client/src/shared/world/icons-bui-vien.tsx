import { useThree } from '@react-three/fiber'
import type { Placement, Vec3 } from './assets'
import { Nearby } from './nearby'
import { Blocks, Sign } from './primitives'
import {
  assemble,
  PropBlocks,
  part,
  STOOL_PARTS,
  TABLE_PARTS,
} from './street-life-kit'

/**
 * Extra Bùi Viện walking-street dressing on the south side of the alley plaza
 * (z 25–27), clear of the central walk to the HẺM ẨM THỰC stop at (−5, 29).
 * Plastic stools, low tables, string bulbs and hanging shop signs. The neon
 * sign FRAMES are built here and their centres exported for Phase 4 to light.
 * All props are non-colliders below knee height.
 */

const WIRE = '#2b2230'
const BULB_WARM = '#ffd98a'
const FRAME = '#4a4654'

const stoolSpots = [-43, -37, -24, -18, -9].map((x) => ({ x, z: 26 }))
const tableSpots = [-40, -21, -6].map((x) => ({ x, z: 26 }))

const dressing = assemble([
  { positions: stoolSpots, parts: STOOL_PARTS },
  { positions: tableSpots, parts: TABLE_PARTS },
  // Low parasol posts (below knee at the base; canopy handled as cutouts).
  {
    positions: tableSpots,
    parts: [part([0, 0.25, 0], [0.09, 0.5, 0.09], '#445c53')],
  },
])

/** String-bulb line across the south plaza; unlit warm/cool glow dots. */
const bulbs: Placement[] = Array.from({ length: 14 }, (_, i) => {
  const x = -45 + i * 3.1
  const y = 4.3 - Math.sin((i / 13) * Math.PI) * 0.5
  return { position: [x, y, 25.4], scale: [0.14, 0.14, 0.14] }
})
const wire: Placement[] = Array.from({ length: 13 }, (_, i) => {
  const x = -45 + i * 3.1 + 1.55
  const y = 4.3 - Math.sin(((i + 0.5) / 13) * Math.PI) * 0.5
  return { position: [x, y + 0.08, 25.4], scale: [3.15, 0.03, 0.03] }
})

/**
 * Neon sign frame centres (world space), facing +z onto the plaza. Phase 4
 * mounts the lit neon tubes inside these frames.
 */
export const BUI_VIEN_NEON_FRAMES: { position: Vec3; scale: Vec3 }[] = [
  { position: [-36, 3.1, 25.2], scale: [2.4, 1.1, 0.12] },
  { position: [-20, 3.4, 25.2], scale: [2.0, 1.4, 0.12] },
  { position: [-7, 3.0, 25.2], scale: [2.2, 1.0, 0.12] },
]

const shopSigns = [
  { x: -36, title: 'NƯỚC MÍA', color: '#386d68' },
  { x: -10, title: 'HỦ TIẾU', color: '#ae5148' },
]

export function BuiVienDressing() {
  // Below 700px the mobile budget is tighter: keep the batched stools/tables,
  // bulbs and wire, but drop the per-mesh shop Signs and the neon frames
  // (Phase 4 relights them on desktop). Alley plaza spans x −47..−1 at z ≈ 26.
  const mobile = useThree((state) => state.size.width) < 700
  return (
    <Nearby at={[-24, 26]} distance={55}>
      <group name="bui-vien-dressing">
        <PropBlocks batches={dressing} />
        <Blocks color={BULB_WARM} unlit placements={bulbs} />
        {!mobile && (
          <>
            {/* Bulb wire: desktop only, one batched draw. */}
            <Blocks color={WIRE} placements={wire} />
            {/* Empty neon frames; Phase 4 lights them. One batched draw. */}
            <Blocks
              color={FRAME}
              placements={BUI_VIEN_NEON_FRAMES.map((f) => ({
                position: f.position,
                scale: f.scale,
              }))}
            />
            {shopSigns.map(({ x, title, color }) => (
              <Sign
                key={title}
                text={title}
                position={[x, 2.1, 25.4]}
                color={color}
                width={2.4}
                height={0.5}
              />
            ))}
          </>
        )}
      </group>
    </Nearby>
  )
}

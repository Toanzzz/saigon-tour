import type { Placement, Vec3 } from './assets'
import { ICON_FOOTPRINTS } from './district'
import { Nearby } from './nearby'
import { Block, Blocks } from './primitives'

/**
 * Phase-2 Nguyễn Huệ landmarks: Bitexco and the 42 Nguyễn Huệ café-apartments.
 * Both are procedural, instanced `Blocks` with palette-ish toon colours; the
 * helipad mark and burst rings are unlit glow quads. Scenery only.
 */

const GLASS = '#8fb7c9'
const STONE = '#e7d4ad'
const PODIUM = '#d9c6a0'
const LEAF = '#c7d9c2'

/** Lotus-bud tower: a tapered stack with a glass band and a cantilever pad. */
export function Bitexco() {
  const { x, z } = ICON_FOOTPRINTS.bitexco
  // Each tier is a box so the whole tower batches into one instanced draw.
  const tiers: Placement[] = []
  const steps = 9
  const base = 5.6
  const top = 2.2
  const floor = 1.2
  const bandAt = Math.round(steps * 0.62)
  const glass: Placement[] = []
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1)
    const width = base + (top - base) * t
    const y = floor * 0.5 + i * floor * 1.6
    const slot = i === bandAt ? glass : tiers
    slot.push({ position: [0, y, 0], scale: [width, floor * 1.5, width] })
  }
  // Lotus-bud crown: three shrinking stacked discs approximated by boxes.
  const crownY = floor * 0.5 + steps * floor * 1.6
  for (let i = 0; i < 3; i++) {
    const width = top * (1 - i * 0.28)
    tiers.push({
      position: [0, crownY + i * 1.3, 0],
      scale: [width, 1.4, width],
    })
  }
  const spireY = crownY + 3 * 1.3
  // Fold the spire into the STONE batch so the whole mast is one draw call.
  tiers.push({ position: [0, spireY + 1.4, 0], scale: [0.35, 2.8, 0.35] })
  // Cantilever helipad disc at ~70% height, on the +x (plaza) side.
  const padY = floor * 0.5 + Math.round(steps * 0.7) * floor * 1.6
  const padX = base * 0.5 + 1.3
  const padCx = padX + 0.6
  // Tall landmark along Nguyễn Huệ; culled past the plaza so the far perf
  // poses (spawn, cathedral, alley) don't pay for it.
  return (
    <Nearby at={[x, z]} distance={48}>
      <group position={[x, 0, z]}>
        <Blocks color={STONE} placements={tiers} shadow />
        <Blocks color={GLASS} placements={glass} />
        {/* Helipad arm (PODIUM). */}
        <Block
          position={[padX * 0.5, padY, 0]}
          scale={[padX, 0.4, 2.6]}
          color={PODIUM}
        />
        {/* Helipad disc, unlit. */}
        <mesh position={[padCx, padY + 0.25, 0]}>
          <cylinderGeometry args={[2.3, 2.3, 0.3, 24]} />
          <meshBasicMaterial color="#efe3c2" toneMapped={false} />
        </mesh>
        {/* Comic "H" — two posts + a crossbar, unlit so it reads like paint. */}
        <Blocks
          color="#d2402f"
          unlit
          placements={[
            { position: [padCx, padY + 0.42, -0.85], scale: [0.35, 0.04, 1.8] },
            { position: [padCx, padY + 0.42, 0.85], scale: [0.35, 0.04, 1.8] },
            { position: [padCx, padY + 0.42, 0], scale: [0.35, 0.04, 0.5] },
          ]}
        />
        {/* One burst ring around the pad, unlit glow. */}
        <mesh
          position={[padCx, padY + 0.42, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[2.7, 3.1, 24]} />
          <meshBasicMaterial color="#ffe14d" toneMapped={false} />
        </mesh>
      </group>
    </Nearby>
  )
}

/** 42 Nguyễn Huệ: a 9-storey block whose balcony grid reads like comic panels. */
export function CafeApartments() {
  const { x, z } = ICON_FOOTPRINTS.cafeApartments
  const floors = 9
  const cols = 3
  const floorH = 1.9
  const width = 5
  const depth = 4.4
  const block: Placement[] = [
    {
      position: [0, (floors * floorH) / 2, 0],
      scale: [width, floors * floorH, depth],
    },
  ]
  // Balcony frames on the +z (plaza) face, coloured per panel like a comic.
  const colours = ['#d98b5a', '#5a8fa0']
  const frames: Record<string, Placement[]> = {}
  const faceZ = depth / 2 + 0.06
  for (let f = 0; f < floors; f++) {
    for (let c = 0; c < cols; c++) {
      const cx = (c - (cols - 1) / 2) * 1.5
      const cy = f * floorH + 1.1
      const colour = colours[(f * cols + c) % colours.length]
      frames[colour] ??= []
      const batch = frames[colour]
      // Thin frame = four bars around a recessed panel.
      batch.push(
        { position: [cx, cy + 0.65, faceZ], scale: [1.2, 0.12, 0.12] },
        { position: [cx, cy - 0.65, faceZ], scale: [1.2, 0.12, 0.12] },
        { position: [cx - 0.55, cy, faceZ], scale: [0.12, 1.4, 0.12] },
        { position: [cx + 0.55, cy, faceZ], scale: [0.12, 1.4, 0.12] }
      )
    }
  }
  return (
    <Nearby at={[x, z]} distance={48}>
      <group position={[x, 0, z]}>
        <Blocks color={STONE} placements={block} shadow />
        {Object.entries(frames).map(([colour, placements]) => (
          <Blocks key={colour} color={colour} placements={placements} />
        ))}
        {/* Rooftop parapet + a token leaf line, the café-apartment look. */}
        <Block
          position={[0, floors * floorH + 0.2, 0]}
          scale={[width + 0.3, 0.4, depth + 0.3]}
          color={PODIUM}
        />
        <Blocks
          color={LEAF}
          placements={[-1.5, 0, 1.5].map((cx) => ({
            position: [cx, floors * floorH + 0.6, faceZ - 0.2],
            scale: [0.9, 0.5, 0.3],
          }))}
        />
      </group>
    </Nearby>
  )
}

/**
 * Neon strip placements on the café-apartment plaza face, world-space, exported
 * for Phase 4 to light. World centre is ICON_FOOTPRINTS.cafeApartments.
 */
export const CAFE_NEON_STRIPS: { position: Vec3; scale: Vec3 }[] = (() => {
  const { x, z } = ICON_FOOTPRINTS.cafeApartments
  const faceZ = z + 4.4 / 2 + 0.12
  return [2, 5, 8].map((f) => ({
    position: [x, f * 1.9 + 1.1, faceZ] as Vec3,
    scale: [4.6, 0.18, 0.08] as Vec3,
  }))
})()

import type { Placement, Vec3 } from './assets'
import { Block, Blocks } from './primitives'

const STONE = '#f4dfb4'
const LIGHT_STONE = '#fff0d2'

export function ArchedBays({
  xs,
  y = 0.6,
  z,
  width = 1.3,
  height = 1.9,
  color = '#426c64',
}: {
  xs: number[]
  y?: number
  z: number
  width?: number
  height?: number
  color?: string
}) {
  const radius = width / 2
  const glass: Placement[] = []
  const trim: Placement[] = []
  const bars: Placement[] = []
  for (const x of xs) {
    glass.push({
      position: [x, y + height / 2, z],
      scale: [width, height, 0.08],
    })
    for (let row = 0; row < 7; row++) {
      const unit = (row + 0.5) / 7
      glass.push({
        position: [x, y + height + radius * unit, z],
        scale: [width * Math.sqrt(1 - unit * unit), radius / 7, 0.08],
      })
    }
    for (const side of [-1, 1]) {
      trim.push({
        position: [x + side * (radius + 0.075), y + height / 2, z + 0.055],
        scale: [0.15, height, 0.16],
      })
    }
    for (let segment = 0; segment < 11; segment++) {
      const angle = (segment * Math.PI) / 10
      trim.push({
        position: [
          x + Math.cos(angle) * (radius + 0.075),
          y + height + Math.sin(angle) * (radius + 0.075),
          z + 0.055,
        ],
        rotation: [0, 0, angle + Math.PI / 2],
        scale: [0.27, 0.15, 0.16],
      })
    }
    bars.push(
      {
        position: [x, y + height / 2, z + 0.08],
        scale: [0.06, height + radius, 0.08],
      },
      {
        position: [x, y + height * 0.65, z + 0.08],
        scale: [width, 0.065, 0.08],
      },
      {
        position: [x, y - 0.06, z + 0.08],
        scale: [width + 0.4, 0.16, 0.28],
      }
    )
  }
  return (
    <group>
      <Blocks color={color} placements={glass} />
      <Blocks color={LIGHT_STONE} placements={trim} />
      <Blocks color={STONE} placements={bars} />
    </group>
  )
}

export function Colonnade({
  xs,
  z,
  height = 3.65,
  y = 1,
}: {
  xs: number[]
  z: number
  height?: number
  y?: number
}) {
  return (
    <group>
      <Blocks
        color={LIGHT_STONE}
        placements={xs.map((x) => ({
          position: [x, y + height / 2, z],
          scale: [0.35, height, 0.42],
        }))}
      />
      <Blocks
        color={STONE}
        placements={xs.flatMap((x) => [
          { position: [x, y, z], scale: [0.68, 0.3, 0.68] },
          {
            position: [x, y + height - 0.06, z],
            scale: [0.68, 0.3, 0.68],
          },
          {
            position: [x, y + height + 0.17, z],
            scale: [0.83, 0.16, 0.75],
          },
        ])}
      />
    </group>
  )
}

export function Pediment({
  width,
  height,
  y,
  z,
}: {
  width: number
  height: number
  y: number
  z: number
}) {
  const angle = Math.atan2(height, width / 2)
  const length = Math.hypot(width / 2, height)
  return (
    <group>
      <Blocks
        color={LIGHT_STONE}
        placements={Array.from({ length: 12 }, (_, row) => ({
          position: [0, y + ((row + 0.5) / 12) * height, z],
          scale: [width * (1 - row / 12), height / 12 + 0.01, 0.36],
        }))}
      />
      <Blocks
        color={STONE}
        placements={[-1, 1].map((side) => ({
          position: [(side * width) / 4, y + height / 2, z + 0.16],
          rotation: [0, 0, -side * angle],
          scale: [length + 0.3, 0.23, 0.5],
        }))}
      />
      <Block
        color={STONE}
        position={[0, y - 0.05, z + 0.08]}
        scale={[width + 0.4, 0.3, 0.7]}
      />
    </group>
  )
}

export function FacadeClock({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      <mesh>
        <circleGeometry args={[0.53, 24]} />
        <meshStandardMaterial color="#fff1cd" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0, 0.015]}>
        <ringGeometry args={[0.48, 0.57, 24]} />
        <meshStandardMaterial color="#796444" roughness={0.85} />
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
      <Block
        position={[0, 0.14, 0.045]}
        scale={[0.045, 0.3, 0.03]}
        color="#3c514b"
      />
      <Block
        position={[0.105, 0.02, 0.05]}
        rotation={[0, 0, -Math.PI / 2.5]}
        scale={[0.055, 0.27, 0.03]}
        color="#3c514b"
      />
    </group>
  )
}

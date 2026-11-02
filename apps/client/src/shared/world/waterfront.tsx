import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group } from 'three'
import { Model, type Placement, type Vec3 } from './assets'
import { mapInspectorEnabled } from './map-debug'
import { Block, Blocks, Sign } from './primitives'

const pierPosts: Placement[] = [-1, 1].flatMap((side) =>
  [40, 43, 46].map((z) => ({
    position: [52 + side * 2.2, 0.6, z],
    scale: [0.24, 2.1, 0.24],
  }))
)
const pierBoards: Placement[] = Array.from({ length: 15 }, (_, i) => ({
  position: [52, 0.3, 38.2 + i * 0.58],
  scale: [4.4, 0.18, 0.51],
}))
const lampPosts: Placement[] = [46, 58, 78, 93].map((x) => ({
  position: [x, 1.65, 37.4],
  scale: [0.12, 3.3, 0.12],
}))
const lamps: Placement[] = lampPosts.map((lamp) => ({
  position: [lamp.position[0], 3.3, 37.4],
  scale: [0.42, 0.55, 0.42],
}))

export function WaterfrontLife({ paused = false }: { paused?: boolean }) {
  return (
    <group name="waterfront-life">
      <RiverBoat
        path="boats/boat-fishing-small"
        origin={[40, -0.1, 48]}
        scale={2.1}
        phase={0}
        range={6}
        paused={paused}
      />
      <RiverBoat
        path="boats/boat-row-small"
        origin={[-15, -0.1, 54]}
        scale={2}
        phase={2.1}
        range={2.5}
        paused={paused}
      />
      <Landing />
      <RiverTower />
    </group>
  )
}

function RiverBoat({
  path,
  origin,
  scale,
  phase,
  range,
  paused,
}: {
  path: string
  origin: Vec3
  scale: number
  phase: number
  range: number
  paused: boolean
}) {
  const ref = useRef<Group>(null)
  const time = useRef(phase)
  useFrame(({ camera }, delta) => {
    if (!ref.current) return
    const near =
      mapInspectorEnabled() ||
      (camera.position.x - origin[0]) ** 2 +
        (camera.position.z - origin[2]) ** 2 <
        90 * 90
    ref.current.visible = near
    if (!near || paused) return
    time.current += Math.min(delta, 0.05)
    ref.current.position.set(
      origin[0] + Math.sin(time.current * 0.08) * range,
      origin[1] + Math.sin(time.current * 1.1) * 0.045,
      origin[2]
    )
    ref.current.rotation.z = Math.sin(time.current * 0.8) * 0.012
  })
  return (
    <group ref={ref} position={origin}>
      <Model
        path={path}
        rotation={[0, Math.PI / 2, 0]}
        scale={scale}
        shadow={false}
      />
    </group>
  )
}

function Landing() {
  return (
    <group name="river-landing">
      <Blocks color="#a58560" placements={pierBoards} />
      <Blocks color="#667e70" placements={pierPosts} />
      <Blocks
        color="#e5d1aa"
        placements={[-1, 1].map((side) => ({
          position: [52 + side * 2.2, 1.2, 42.8],
          scale: [0.09, 0.09, 7.5],
        }))}
      />
      <Blocks color="#486d62" placements={lampPosts} />
      <Blocks color="#f2d39b" placements={lamps} />
      <Block
        position={[52, 0.16, 37.2]}
        scale={[7, 0.18, 1.5]}
        color="#c9a575"
      />
      <Block
        position={[55.6, 1.1, 37.2]}
        scale={[0.13, 2.2, 0.13]}
        color="#486d62"
      />
      <Sign
        text="BẠCH ĐẰNG"
        subtitle="MỘT TẤM BƯU THIẾP TỪ SÀI GÒN"
        position={[52, 2.35, 37.1]}
        width={4.7}
        height={0.95}
        color="#386d68"
      />
      <Sign
        text="BẾN THUYỀN"
        position={[55.6, 2.2, 37.3]}
        rotation={[0, Math.PI / 2, 0]}
        width={2}
        height={0.55}
        color="#a7503f"
      />
    </group>
  )
}

const towerMasses: Placement[] = [
  { position: [52, 7, 81], scale: [8.5, 14, 6.8] },
  { position: [50.8, 17, 81], scale: [5.9, 34, 5.8] },
  { position: [52.3, 24, 80.8], scale: [4.6, 48, 4.6] },
  { position: [53.5, 29, 80.6], scale: [2.7, 58, 3.1] },
  { position: [54, 32, 80.3], scale: [1.2, 64, 1.5] },
]
const towerBands: Placement[] = Array.from({ length: 26 }, (_, i) => ({
  position: [52, 2 + i * 2, 78.1],
  scale: [i < 7 ? 7.5 : i < 17 ? 5.5 : 3.5, 0.13, 0.07],
}))
const towerPiers: Placement[] = [-1.9, -0.8, 0.4, 1.5].map((x, i) => ({
  position: [52 + x, 18 + i * 4, 78],
  scale: [0.12, 36 + i * 8, 0.09],
}))

function RiverTower() {
  return (
    <group name="distant-landmark-tower">
      <Blocks color="#5e9990" placements={towerMasses} />
      <Blocks color="#b7cbb4" placements={towerBands} />
      <Blocks color="#9cbfb3" placements={towerPiers} />
      <Block
        position={[54, 68, 80.3]}
        scale={[0.18, 8, 0.18]}
        color="#bdc9b4"
      />
    </group>
  )
}

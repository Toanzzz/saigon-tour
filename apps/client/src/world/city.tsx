import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { useMemo } from 'react'
import { Model, ModelInstances, type Placement, type Vec3 } from './assets'
import { Cathedral, MarketStall, ParkFeatures } from './landmarks'
import { buildingRows } from './layout'
import { Block, Blocks, Sign } from './primitives'
import { Crosswalk, Planting, Promenade, Shophouses, StopSign } from './streets'

const palmPlacements: Placement[] = [
  [-38, -25],
  [-8, -24],
  [-38, -1],
  [-8, 1],
  [13, -34],
  [13, -16],
  [38, -17],
  [38, 4],
  [-37, 32],
  [-23, 32],
  [-8, 32],
  [6, 32],
  [35, 32],
  [13, 23],
  [36, 23],
].map(([x, z], i) => ({
  position: [x, 0.1, z],
  scale: 4.1 + (i % 3) * 0.3,
  rotation: [0, i * 1.74, 0],
}))
const treePlacements: Placement[] = [
  [19, -13],
  [35, -13],
  [34, -2],
  [20, -3],
  [30, 1],
  [20, -8],
  [-4, -23],
].map(([x, z], i) => ({ position: [x, 0.15, z], scale: 3.7 + (i % 2) * 0.8 }))
const streetLights: Placement[] = [-35, -20, -5, 20, 35].flatMap((x) => [
  { position: [x, 0, 6.7], scale: 6.2, rotation: [0, Math.PI, 0] } as Placement,
  { position: [x, 0, 17.3], scale: 6.2 } as Placement,
])

export function CityWorld() {
  const laneMarks = useMemo<Placement[]>(
    () => [
      ...Array.from({ length: 23 }, (_, i) => ({
        position: [-44 + i * 4, 0.034, 12] as Vec3,
        scale: [1.8, 0.02, 0.12] as Vec3,
      })),
      ...Array.from({ length: 20 }, (_, i) => ({
        position: [8, 0.035, -39 + i * 4] as Vec3,
        scale: [0.12, 0.02, 1.8] as Vec3,
      })),
    ],
    []
  )
  return (
    <group>
      <Block position={[0, -0.3, 0]} scale={[104, 0.6, 96]} color="#d7c7a3" />
      <Block position={[0, 0.01, 12]} scale={[96, 0.04, 7]} color="#586465" />
      <Block position={[8, 0.015, -2]} scale={[7, 0.04, 84]} color="#586465" />
      <Blocks
        color="#586465"
        placements={[
          { position: [14.5, 0.02, 1], scale: [13, 0.04, 4] },
          { position: [14, 0.02, -23], scale: [12, 0.04, 4] },
          { position: [13.5, 0.02, 29], scale: [11, 0.04, 4] },
        ]}
      />
      <Blocks placements={laneMarks} color="#ecce8c" />
      <Blocks
        color="#eee2c5"
        placements={[
          { position: [-20, 0.12, 7.7], scale: [54, 0.24, 0.4] },
          { position: [-20, 0.12, 16.3], scale: [54, 0.24, 0.4] },
          { position: [30, 0.12, 7.7], scale: [33, 0.24, 0.4] },
          { position: [30, 0.12, 16.3], scale: [33, 0.24, 0.4] },
          { position: [3.7, 0.12, -15], scale: [0.4, 0.24, 50] },
          { position: [12.3, 0.12, -34], scale: [0.4, 0.24, 12] },
          { position: [12.3, 0.12, -11], scale: [0.4, 0.24, 18] },
          { position: [12.3, 0.12, 5.5], scale: [0.4, 0.24, 3] },
        ]}
      />
      <Crosswalk x={-7} z={12} />
      <Crosswalk x={19} z={12} />
      <Block
        position={[-23, 0.06, -12]}
        scale={[27, 0.12, 24]}
        color="#c3b292"
      />
      <Block position={[-23, 0.07, 3]} scale={[27, 0.14, 8]} color="#dfccaa" />
      <Model
        path="ben-thanh-market"
        position={[-23, 0.12, -12]}
        scale={0.7}
        shadow={false}
      />
      <MarketStall />
      <Shophouses />
      <ParkFeatures />
      <Cathedral />
      <ModelInstances
        path="nature/tree_palmDetailedTall"
        placements={palmPlacements}
      />
      <ModelInstances path="nature/tree_fat" placements={treePlacements} />
      <ModelInstances path="roads/light-curved" placements={streetLights} />
      <Planting />
      <Promenade />
      <StopSign position={[-10, 0, 6.4]} name="BẾN THÀNH" />
      <StopSign position={[18.4, 0, 2.8]} name="CÔNG VIÊN" />
      <StopSign position={[17, 0, -25]} name="NHÀ THỜ" />
      <StopSign position={[16, 0, 31]} name="BẾN SÔNG" />
      <Sign
        text="LÊ LỢI"
        position={[-5, 2.4, 5.8]}
        width={2}
        height={0.55}
        color="#26577a"
      />
      <Sign
        text="SÀI GÒN"
        subtitle="MỘT CHUYẾN ĐI, NHIỀU CÂU CHUYỆN"
        position={[-17, 4.1, 0.5]}
        width={4.6}
        height={1.15}
        color="#b45940"
      />
      <Collision />
    </group>
  )
}

function Collision() {
  return (
    <RigidBody type="fixed" colliders={false} friction={0}>
      <CuboidCollider args={[52, 0.3, 48]} position={[0, -0.3, 0]} />
      <CuboidCollider args={[11.8, 4, 9.8]} position={[-23, 4, -12]} />
      <CuboidCollider args={[6.2, 6, 4.7]} position={[27, 6, -31]} />
      <CuboidCollider args={[1.95, 0.6, 0.7]} position={[-23, 0.6, 1.35]} />
      <CuboidCollider args={[2.5, 0.8, 2.5]} position={[30, 0.8, -11]} />
      {[...palmPlacements, ...treePlacements].map((tree) => (
        <CuboidCollider
          key={`tree-${tree.position[0]}-${tree.position[2]}`}
          args={[0.25, 2, 0.25]}
          position={[tree.position[0], 2, tree.position[2]]}
        />
      ))}
      {[
        [34, -12],
        [19, -12],
        [24, 33],
        [-27, 35],
      ].map(([x, z]) => (
        <CuboidCollider
          key={`bench-${x}`}
          args={[1.4, 0.6, 0.5]}
          position={[x, 0.6, z]}
          rotation={[0, z === -12 ? Math.PI / 2 : 0, 0]}
        />
      ))}
      {buildingRows.map((row) => (
        <CuboidCollider
          key={`${row.x}/${row.z}`}
          args={[2.8, 4, 2.7]}
          position={[row.x, 4, row.z]}
          rotation={[0, row.yaw, 0]}
        />
      ))}
      <CuboidCollider args={[1, 8, 49]} position={[-48, 8, 0]} />
      <CuboidCollider args={[1, 8, 49]} position={[48, 8, 0]} />
      <CuboidCollider args={[49, 8, 1]} position={[0, 8, -45]} />
      <CuboidCollider args={[49, 8, 1]} position={[0, 8, 38.7]} />
    </RigidBody>
  )
}

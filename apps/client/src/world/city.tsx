import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { Model, ModelInstances, type Placement } from './assets'
import { CivicDistrict, Skyline } from './civic'
import { BOUNDS, GROUND, LANDMARKS, MARKET, WALLS } from './district'
import { MarketStall, ParkFeatures } from './landmarks'
import { buildingRows } from './layout'
import { Block, Sign } from './primitives'
import { Roads } from './roads'
import { Planting, Promenade, Shophouses, StopSign } from './streets'

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
  [52, 32],
  [86, 32],
  [64, -6],
  [74, -6],
  [64, 4],
  [74, 4],
  [64, 21],
  [74, 21],
  [82, -64],
  [94, -64],
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
  [93, -40],
  [93, -30],
  [83, -50],
].map(([x, z], i) => ({ position: [x, 0.15, z], scale: 3.7 + (i % 2) * 0.8 }))
const streetLights: Placement[] = [-35, -20, -5, 20, 35, 50, 82, 100].flatMap(
  (x) => [
    {
      position: [x, 0, 6.7],
      scale: 6.2,
      rotation: [0, Math.PI, 0],
    } as Placement,
    { position: [x, 0, 17.3], scale: 6.2 } as Placement,
  ]
)

export function CityWorld() {
  return (
    <group>
      {GROUND.map((rect) => (
        <Block
          key={`${rect.x}/${rect.z}`}
          position={[rect.x, -0.3, rect.z]}
          scale={[rect.w, 0.6, rect.d]}
          color="#d7c7a3"
        />
      ))}
      <Roads />
      <Block
        position={[MARKET.x, 0.06, MARKET.z]}
        scale={[MARKET.w + 3, 0.12, MARKET.d + 4]}
        color="#c3b292"
      />
      <Block position={[-23, 0.07, 3]} scale={[27, 0.14, 8]} color="#dfccaa" />
      <Model
        path="landmarks/cho-ben-thanh"
        position={[-23, 0.12, -12]}
        scale={0.7}
        shadow={false}
      />
      <MarketStall />
      <Shophouses />
      <ParkFeatures />
      <CivicDistrict />
      <Skyline />
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
      <StopSign position={[60, 0, 6.4]} name="TÒA THỊ CHÍNH" />
      <StopSign
        position={[84, 0, -58]}
        rotation={[0, Math.PI / 2, 0]}
        name="NHÀ THỜ ĐỨC BÀ"
      />
      <StopSign position={[16, 0, 31]} name="BẾN SÔNG" />
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
  const { minX, maxX, minZ, maxZ } = BOUNDS
  return (
    <RigidBody type="fixed" colliders={false} friction={0}>
      <CuboidCollider
        args={[(maxX - minX) / 2, 0.3, (maxZ - minZ) / 2]}
        position={[(maxX + minX) / 2, -0.3, (maxZ + minZ) / 2]}
      />
      <CuboidCollider args={[11.8, 4, 9.8]} position={[-23, 4, -12]} />
      {Object.values(LANDMARKS).map(({ footprint: f }) => (
        <CuboidCollider
          key={`${f.x}/${f.z}`}
          args={[f.w / 2, 6, f.d / 2]}
          position={[f.x, 6, f.z]}
        />
      ))}
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
      {WALLS.map(([x, z, hx, hz]) => (
        <CuboidCollider
          key={`wall-${x}/${z}`}
          args={[hx, 8, hz]}
          position={[x, 8, z]}
        />
      ))}
    </RigidBody>
  )
}

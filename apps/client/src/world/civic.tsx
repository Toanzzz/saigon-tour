import { Model, ModelInstances, type Placement } from './assets'
import { LANDMARKS } from './district'
import { Bench } from './landmarks'
import { Block, Blocks, Sign } from './primitives'

/** Tòa Thị Chính, Nguyễn Huệ, Nhà thờ Đức Bà and Công xã Paris. */
export function CivicDistrict() {
  const { cityhall, cathedral } = LANDMARKS
  return (
    <group>
      <Model
        path={cityhall.model}
        position={cityhall.position}
        scale={cityhall.scale}
      />
      <Block position={[69, 0.1, -19]} scale={[26, 0.2, 3]} color="#d9c49c" />
      <Sign
        text="TÒA THỊ CHÍNH"
        subtitle="UBND THÀNH PHỐ HỒ CHÍ MINH"
        position={[69, 1.2, -16.9]}
        width={4.2}
        height={1}
        color="#8a3c32"
      />
      <NguyenHue />
      <Model
        path={cathedral.model}
        position={cathedral.position}
        rotation={[0, 0, 0]}
        scale={cathedral.scale}
      />
      <CongXaParis />
    </group>
  )
}

function NguyenHue() {
  const planters: Placement[] = [-8, -2, 4, 20, 26, 31].flatMap((z) =>
    [63.6, 74.4].map((x) => ({
      position: [x, 0.35, z] as [number, number, number],
      scale: [1.4, 0.7, 1.4] as [number, number, number],
    }))
  )
  return (
    <group>
      <Blocks color="#cdb58a" placements={planters} />
      <ModelInstances
        path="nature/plant_bush"
        placements={planters.map((p) => ({
          position: [p.position[0], 0.7, p.position[2]],
          scale: 2.2,
        }))}
      />
      <mesh position={[69, 0.3, -11]} receiveShadow>
        <cylinderGeometry args={[2.4, 2.6, 0.5, 24]} />
        <meshStandardMaterial color="#d1bfa0" roughness={0.8} />
      </mesh>
      <mesh position={[69, 0.57, -11]}>
        <cylinderGeometry args={[2.1, 2.1, 0.06, 24]} />
        <meshStandardMaterial color="#5dada3" roughness={0.25} />
      </mesh>
      <Model
        path="landmarks/toa-thi-chinh-statue"
        position={[69, 0.6, -11]}
        scale={4.2}
      />
      <Sign
        text="PHỐ ĐI BỘ NGUYỄN HUỆ"
        position={[69, 2.3, 31.5]}
        rotation={[0, Math.PI, 0]}
        width={4.4}
        height={0.8}
        color="#26577a"
      />
      <Bench position={[65, 0, 1]} rotation={[0, Math.PI / 2, 0]} />
      <Bench position={[73, 0, 1]} rotation={[0, -Math.PI / 2, 0]} />
      <Bench position={[65, 0, 24]} rotation={[0, Math.PI / 2, 0]} />
      <Bench position={[73, 0, 24]} rotation={[0, -Math.PI / 2, 0]} />
    </group>
  )
}

function CongXaParis() {
  return (
    <group>
      <mesh position={[88, 0.2, -72]} receiveShadow>
        <cylinderGeometry args={[4, 4.2, 0.3, 28]} />
        <meshStandardMaterial color="#8fba75" roughness={0.9} />
      </mesh>
      <Model
        path="landmarks/nha-tho-duc-ba-statue"
        position={[88, 0.35, -72]}
        scale={4.8}
      />
      <Sign
        text="NHÀ THỜ ĐỨC BÀ"
        subtitle="CÔNG XÃ PARIS"
        position={[88, 1.1, -66.4]}
        width={4}
        height={0.95}
        color="#774b40"
      />
      <Bench position={[81, 0, -76]} rotation={[0, Math.PI / 2, 0]} />
      <Bench position={[95, 0, -76]} rotation={[0, -Math.PI / 2, 0]} />
    </group>
  )
}

/** Thủ Thiêm-side towers across the river: background only, no collision. */
export function Skyline() {
  const towers = [
    { path: 'city/building-skyscraper-b', x: -30, s: 7 },
    { path: 'city/building-skyscraper-d', x: 8, s: 8 },
    { path: 'city/building-skyscraper-a', x: 40, s: 7 },
    { path: 'city/building-skyscraper-e', x: 70, s: 8 },
    { path: 'city/building-skyscraper-d', x: 104, s: 11 },
  ]
  const low: Placement[] = [-44, -16, 22, 54, 88, 118].map((x, i) => ({
    position: [x, 0, 68 + (i % 2) * 4],
    scale: 7,
  }))
  return (
    <group>
      <Block position={[30, -0.2, 72]} scale={[220, 0.4, 14]} color="#c3c7b3" />
      {towers.map((tower) => (
        <Model
          key={tower.x}
          path={tower.path}
          position={[tower.x, 0, 74]}
          rotation={[0, Math.PI, 0]}
          scale={tower.s}
          shadow={false}
        />
      ))}
      <ModelInstances
        path="city/low-detail-building-wide-a"
        placements={low}
        shadow={false}
      />
    </group>
  )
}

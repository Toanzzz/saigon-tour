import { ModelInstances, type Placement, type Vec3 } from './assets'
import { Block, Blocks, Sign } from './primitives'

const cityHallBanners: Placement[] = [-1, 1].map((side) => ({
  position: [69 + side * 10.4, 1.75, -18.1] as Vec3,
  scale: [0.08, 3.1, 0.08] as Vec3,
}))

const cityHallFlags: Placement[] = [-1, 1].map((side) => ({
  position: [69 + side * 10.4, 3.2, -18.1] as Vec3,
  scale: [0.42, 0.65, 0.08] as Vec3,
  rotation: [0, side < 0 ? 0.08 : -0.08, 0],
}))

const operaKiosk: Placement[] = [
  { position: [95.2, 0.7, -28.9], scale: [2.4, 1.4, 1.1] },
  { position: [95.2, 1.55, -28.9], scale: [2.7, 0.14, 1.3] },
]

const operaPosters: Placement[] = [-1, 0, 1].map((offset) => ({
  position: [
    95.16,
    1.25 + Math.abs(offset) * 0.04,
    -28.9 + offset * 0.72,
  ] as Vec3,
  scale: [0.04, 0.56, 0.46] as Vec3,
}))

const postOfficeMailboxes: Placement[] = [-1, 1].map((side) => ({
  position: [103.2, 0.72, -84 + side * 3.1] as Vec3,
  scale: [0.56, 1.35, 0.42] as Vec3,
}))

const postOfficeFlowers: Placement[] = [-1, 1].flatMap((side) =>
  [-86.3, -82.1].map((z) => ({
    position: [105.4 + side * 7.2, 0.45, z] as Vec3,
    scale: [0.82, 0.7, 0.82] as Vec3,
  }))
)

const cathedralBeds: Placement[] = [-1, 1].flatMap((side) =>
  [-79.7, -76.6].map((z) => ({
    position: [88 + side * 8.1, 0.25, z] as Vec3,
    scale: [2.1, 0.5, 0.7] as Vec3,
  }))
)

const promenadeKiosks: Placement[] = [
  { position: [7, 0.7, 34.4], scale: [2.3, 1.4, 1.2] },
  { position: [15, 0.7, 34.4], scale: [2.3, 1.4, 1.2] },
]

const promenadeRoofs: Placement[] = promenadeKiosks.map((item) => ({
  position: [item.position[0], 1.56, item.position[2]] as Vec3,
  scale: [2.7, 0.14, 1.5] as Vec3,
}))

const promenadeStools: Placement[] = [7, 15].flatMap((x) =>
  [-1, 1].map((side) => ({
    position: [x + side * 1.55, 0.34, 35.2] as Vec3,
    scale: [0.38, 0.68, 0.38] as Vec3,
  }))
)

const cityHallShrubs: Placement[] = [-1, 1].map((side) => ({
  position: [69 + side * 10.4, 0.55, -18.1] as Vec3,
  scale: 1.45,
}))

const operaShrubs: Placement[] = [-1, 1].map((side) => ({
  position: [95.2, 0.65, -27.1 + side * 2.1] as Vec3,
  scale: 1.15,
}))

const postOfficeShrubs: Placement[] = postOfficeFlowers.map((item) => ({
  position: [item.position[0], 0.8, item.position[2]] as Vec3,
  scale: 1.1,
}))

const cathedralFlowers: Placement[] = cathedralBeds.flatMap((bed) => [
  {
    position: [bed.position[0] - 0.65, 0.72, bed.position[2]] as Vec3,
    scale: 1.1,
  },
  {
    position: [bed.position[0] + 0.65, 0.72, bed.position[2]] as Vec3,
    scale: 1.1,
  },
])

export function DistrictLife() {
  return (
    <group name="district-life">
      <CityHallForecourt />
      <OperaPlaza />
      <PostOfficeSquare />
      <CathedralSquare />
      <RiverPromenade />
    </group>
  )
}

function CityHallForecourt() {
  return (
    <group name="city-hall-forecourt">
      <Blocks color="#48685d" placements={cityHallBanners} />
      <Blocks color="#b34f3c" placements={cityHallFlags} />
      <ModelInstances path="nature/plant_bush" placements={cityHallShrubs} />
      <Sign
        text="NGUYỄN HUỆ"
        subtitle="PHỐ ĐI BỘ · ẨM THỰC · ÂM NHẠC"
        position={[69, 1.75, -18.25]}
        width={4.5}
        height={0.9}
        color="#265a65"
      />
    </group>
  )
}

function OperaPlaza() {
  return (
    <group name="opera-plaza">
      <Blocks color="#9f6b4f" placements={operaKiosk} />
      <Blocks color="#d7b56f" placements={operaPosters} />
      <ModelInstances path="nature/plant_bush" placements={operaShrubs} />
      <Sign
        text="VÉ TỐI NAY"
        subtitle="NHÀ HÁT THÀNH PHỐ"
        position={[95.2, 2.15, -28.9]}
        width={2.7}
        height={0.85}
        color="#7e4036"
      />
    </group>
  )
}

function PostOfficeSquare() {
  return (
    <group name="post-office-square">
      <Blocks color="#3d6e68" placements={postOfficeMailboxes} />
      <Blocks color="#d8b96b" placements={postOfficeFlowers} />
      <ModelInstances path="nature/flower_redA" placements={postOfficeShrubs} />
      <Sign
        text="BƯU THIẾP"
        subtitle="GỬI MỘT LỜI THƯƠNG"
        position={[103.2, 1.8, -84]}
        rotation={[0, Math.PI / 2, 0]}
        width={2.8}
        height={0.82}
        color="#4b7266"
      />
    </group>
  )
}

function CathedralSquare() {
  return (
    <group name="cathedral-square">
      <Blocks color="#b98d62" placements={cathedralBeds} />
      <ModelInstances
        path="nature/flower_yellowA"
        placements={cathedralFlowers}
      />
      <Block
        position={[88, 0.11, -78.8]}
        scale={[12.5, 0.14, 0.18]}
        color="#d5c6a5"
      />
      <Sign
        text="CÔNG XÃ PARIS"
        subtitle="NHÀ THỜ ĐỨC BÀ · 1877"
        position={[88, 1.85, -78.5]}
        width={4.3}
        height={0.9}
        color="#71483e"
      />
    </group>
  )
}

function RiverPromenade() {
  return (
    <group name="river-promenade-life">
      <Blocks color="#9f7251" placements={promenadeKiosks} />
      <Blocks color="#d8b66e" placements={promenadeRoofs} />
      <Blocks color="#5f7462" placements={promenadeStools} />
      <Sign
        text="QUÀ VEN SÔNG"
        subtitle="NƯỚC MÍA · CÀ PHÊ · BƯU THIẾP"
        position={[11, 2.2, 34.25]}
        width={4.4}
        height={0.9}
        color="#2f6864"
      />
      <Block
        position={[11, 0.78, 34.35]}
        scale={[0.14, 1.65, 0.14]}
        color="#4d675a"
      />
    </group>
  )
}

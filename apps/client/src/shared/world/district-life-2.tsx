import type { Placement, Vec3 } from './assets'
import { Bench } from './landmarks'
import { Block, Blocks, Sign } from './primitives'

const operaQueuePosts: Placement[] = [-1, 0, 1].flatMap((offset) => [
  {
    position: [92.8 + offset * 1.8, 0.9, -31.2] as Vec3,
    scale: [0.12, 1.8, 0.12] as Vec3,
  },
  {
    position: [92.8 + offset * 1.8, 0.9, -26.8] as Vec3,
    scale: [0.12, 1.8, 0.12] as Vec3,
  },
])
const operaTicketDesk: Placement[] = [
  { position: [89.6, 0.7, -35], scale: [2.2, 1.4, 1.1] },
  { position: [89.6, 1.55, -35], scale: [2.5, 0.14, 1.3] },
]
const operaPosterRail: Placement[] = [-1, 0, 1].map((offset) => ({
  position: [89.45, 1.15, -37.1 + offset * 1.1] as Vec3,
  scale: [0.04, 0.58, 0.42] as Vec3,
}))
const operaQueueRopes: Placement[] = [-1, 0, 1].flatMap((offset) => [
  {
    position: [92.8 + offset * 1.8 + 0.9, 1.55, -31.2] as Vec3,
    scale: [1.7, 0.06, 0.06] as Vec3,
  },
  {
    position: [92.8 + offset * 1.8 + 0.9, 1.55, -26.8] as Vec3,
    scale: [1.7, 0.06, 0.06] as Vec3,
  },
])
const postOfficeParcelCarts: Placement[] = [
  { position: [102.2, 0.45, -76.8], scale: [1.8, 0.75, 0.9] },
  { position: [106.3, 0.45, -76.8], scale: [1.8, 0.75, 0.9] },
]
const postOfficeParcelStacks: Placement[] = postOfficeParcelCarts.flatMap(
  (cart) => [
    {
      position: [cart.position[0] - 0.35, 1, cart.position[2]] as Vec3,
      scale: [0.45, 0.35, 0.45] as Vec3,
    },
    {
      position: [cart.position[0] + 0.25, 1.05, cart.position[2]] as Vec3,
      scale: [0.5, 0.42, 0.5] as Vec3,
    },
  ]
)
const cityHallBunting: Placement[] = Array.from({ length: 7 }, (_, i) => ({
  position: [60 + i * 3, 3.2, -8.2] as Vec3,
  scale: [0.72, 0.42, 0.05] as Vec3,
  rotation: [0, 0, i % 2 ? 0.08 : -0.08] as Vec3,
}))
const parkShadePosts: Placement[] = [-1, 1].map((side) => ({
  position: [28 + side * 3.2, 1.9, -17.1] as Vec3,
  scale: [0.16, 3.8, 0.16] as Vec3,
}))
const riverBollards: Placement[] = Array.from({ length: 10 }, (_, i) => ({
  position: [-2 + i * 6.2, 0.6, 36.5] as Vec3,
  scale: [0.22, 1.1, 0.22] as Vec3,
}))
const riverBikeStands: Placement[] = [4, 12, 20].flatMap((x) => [
  {
    position: [x, 0.55, 34.3] as Vec3,
    scale: [0.12, 1.1, 0.12] as Vec3,
  },
  {
    position: [x + 1.1, 0.55, 34.3] as Vec3,
    scale: [0.12, 1.1, 0.12] as Vec3,
  },
])

export function DistrictLifeTwo() {
  return (
    <group name="district-life-two">
      <OperaStreetScene />
      <PostOfficeStreetScene />
      <CityHallEventScene />
      <ParkShadeScene />
      <RiverPromenadeScene />
    </group>
  )
}

function OperaStreetScene() {
  return (
    <group name="opera-street-scene">
      <Blocks color="#9f6b4f" placements={operaTicketDesk} />
      <Blocks color="#d7b56f" placements={operaPosterRail} />
      <Blocks color="#496c62" placements={operaQueuePosts} />
      <Blocks color="#c58b57" placements={operaQueueRopes} />
      <Bench position={[91.5, 0, -40]} rotation={[0, Math.PI / 2, 0]} />
      <Bench position={[91.5, 0, -30]} rotation={[0, Math.PI / 2, 0]} />
      <Sign
        text="VÉ NHANH"
        subtitle="XẾP HÀNG · 19:30"
        position={[89.25, 2.2, -35]}
        rotation={[0, -Math.PI / 2, 0]}
        width={2.4}
        height={0.82}
        color="#78433c"
      />
    </group>
  )
}

function PostOfficeStreetScene() {
  return (
    <group name="post-office-street-scene">
      <Blocks color="#9b6848" placements={postOfficeParcelCarts} />
      <Blocks color="#d7b16a" placements={postOfficeParcelStacks} />
      <Bench position={[106, 0, -72.5]} rotation={[0, Math.PI, 0]} />
      <Bench position={[101.5, 0, -72.5]} rotation={[0, Math.PI, 0]} />
      <Sign
        text="GÓI HÀNG"
        subtitle="GỬI ĐI · NHẬN VỀ"
        position={[104, 1.85, -77.8]}
        rotation={[0, Math.PI, 0]}
        width={2.9}
        height={0.82}
        color="#3b7068"
      />
    </group>
  )
}

function CityHallEventScene() {
  return (
    <group name="city-hall-event-scene">
      <Blocks color="#c45445" placements={cityHallBunting} />
      <Bench position={[61, 0, -10.8]} rotation={[0, Math.PI / 2, 0]} />
      <Bench position={[77, 0, -10.8]} rotation={[0, -Math.PI / 2, 0]} />
      <Block
        position={[69, 0.18, -6.2]}
        scale={[7.4, 0.14, 0.75]}
        color="#d7c09a"
      />
      <Sign
        text="LỊCH HÔM NAY"
        subtitle="ĐÈN LỒNG · NHẠC · NGƯỜI BẠN"
        position={[69, 1.8, -6.2]}
        width={3.7}
        height={0.85}
        color="#275b61"
      />
    </group>
  )
}

function ParkShadeScene() {
  return (
    <group name="park-shade-scene">
      <Blocks color="#567767" placements={parkShadePosts} />
      <Block
        position={[28, 3.85, -17.1]}
        scale={[7, 0.18, 3.6]}
        color="#d8a15c"
      />
      <Bench position={[28, 0, -15.3]} />
      <Bench position={[28, 0, -19]} rotation={[0, Math.PI, 0]} />
      <Blocks
        color="#d5c3a0"
        placements={[-1, 0, 1].map((x) => ({
          position: [28 + x * 2.2, 0.08, -6.1] as Vec3,
          scale: [0.85, 0.08, 0.4] as Vec3,
        }))}
      />
      <Sign
        text="GÓC ĐỌC"
        subtitle="NGỒI LẠI · NGHE CÂY"
        position={[28, 1.7, -19.6]}
        rotation={[0, Math.PI, 0]}
        width={2.7}
        height={0.8}
        color="#53776b"
      />
    </group>
  )
}

function RiverPromenadeScene() {
  return (
    <group name="river-promenade-scene">
      <Blocks color="#6a7b68" placements={riverBollards} />
      <Blocks color="#a6764d" placements={riverBikeStands} />
      <Bench position={[2, 0, 34]} />
      <Bench position={[21, 0, 34]} rotation={[0, Math.PI, 0]} />
      <Sign
        text="GIỮ XE"
        subtitle="ĐI BỘ VEN SÔNG"
        position={[14, 1.75, 36.2]}
        rotation={[0, Math.PI, 0]}
        width={2.5}
        height={0.8}
        color="#a65042"
      />
    </group>
  )
}

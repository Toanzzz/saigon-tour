import { useFrame } from '@react-three/fiber'
import { type ReactNode, useRef } from 'react'
import type { Group } from 'three'
import { ModelInstances, type Placement, type Vec3 } from './assets'
import { Blocks, Sign } from './primitives'
import {
  assemble,
  at,
  BIKE_PARTS,
  BOX_PARTS,
  CART_PARTS,
  PropBlocks,
  PropRounds,
  part,
  STOOL_PARTS,
  type StreetPlacement,
  TABLE_PARTS,
} from './street-life-kit'

const bikes: StreetPlacement[] = [
  ...[-39, -36, -6, -3].map((x) => ({ x, z: 5.8, yaw: -0.5 })),
  ...[-39, -26, -12, 2].map((x) => ({ x, z: 19, yaw: 0.7 })),
  ...[-41, -34, -15, -2].map((x) => ({ x, z: 32.5, yaw: 0.35 })),
]
const carts: StreetPlacement[] = [
  { x: -34, z: 3.2 },
  { x: -11, z: 3.2 },
  ...[-39, -29, -18, -7].map((x) => ({ x, z: 31.8, yaw: Math.PI })),
]
const tables: StreetPlacement[] = [
  { x: -37.5, z: 1.1 },
  { x: -7.8, z: 1.1 },
  ...[-35, -23, -10].map((x) => ({ x, z: 19.3 })),
  ...[-34, -23, -12].map((x) => ({ x, z: 31.6 })),
]
const stools = tables.flatMap((table) =>
  [-1, 1].map((x) => ({ x: table.x + x, z: table.z }))
)
const pots: StreetPlacement[] = [
  ...[-40, -31, -15, -5].map((x) => ({ x, z: 0.4 })),
  ...[-41, -28, -15, -2].map((x) => ({ x, z: 20.1 })),
  ...[-43, -32, -21, -10, 1].map((x) => ({ x, z: 34.8 })),
]
const boxes = [
  { x: -36.3, z: 3.7 },
  { x: -8.7, z: 3.6 },
  { x: -40.8, z: 31.8 },
  { x: -30.8, z: 32 },
  { x: -19.8, z: 31.8 },
]

// Phase 5d: load every third parked bike with a comic cargo stack and give
// all of them an oversized headlight that glows warm in the evening. The
// cargo reuses the same box batch so it adds no new draw call beyond the two
// cargo colours; the headlight glow is one unlit mesh.
const parkedCargo = assemble([
  {
    positions: bikes,
    parts: (i: number) =>
      i % 3 === 0
        ? [
            part([0, 1.7, -0.78], [0.5, 1.5, 0.5], '#d8b773'),
            part([0, 2.1, -0.78], [0.42, 0.18, 0.42], '#b85a4d'),
          ]
        : [part([0, 1.62, -0.78], [0.78, 0.6, 0.62], '#bcd3dc')],
  },
])
const parkedHeadlights = bikes.map((bike) => at(bike, [0, 1.2, 0.86], 0.42))
// Low planters (below knee, no collider) framing the Lê Lợi junction where the
// xe ôm fragile-parcel wobble fires (corners around the x=8 spur). They sit
// ±4.5 off the x=8 ride path so the auto-piloted ride never clips them.
const cornerPlanters: StreetPlacement[] = [
  { x: 3.5, z: 8.6 },
  { x: 12.5, z: 8.6 },
  { x: 3.5, z: 15.4 },
  { x: 12.5, z: 15.4 },
]

const silhouettes = assemble([
  { positions: bikes, parts: BIKE_PARTS },
  { positions: carts, parts: CART_PARTS },
  { positions: stools, parts: STOOL_PARTS },
  { positions: tables, parts: TABLE_PARTS },
  { positions: boxes, parts: BOX_PARTS },
])
const bushPlacements = pots.map((p) => at(p, [0, 0.62, 0], 2.2))
const foodPlacements = carts.map((p) => at(p, [-0.65, 1.4, 0], 0.65))
const breadPlacements = carts.map((p) => at(p, [0.65, 1.42, 0.1], 0.65))
const bowlPlacements = tables.map((p) => at(p, [0.1, 1.08, 0], 0.7))
const coffeePlacements = tables.map((p) => at(p, [-0.22, 1.08, 0.16], 0.42))
const bananaPlacements = carts.map((p) => at(p, [0.22, 1.42, 0.14], 0.28))

export const STREET_PROPS_COLLIDERS = [
  ...carts.map((p) => ({ x: p.x, z: p.z, w: 2.6, d: 1.25, h: 1.3 })),
  ...tables.map((p) => ({ x: p.x, z: p.z, w: 1.3, d: 1.3, h: 1 })),
  { x: 20.5, z: -15.7, w: 3.2, d: 0.4, h: 2.5 },
  { x: 35.3, z: -4.2, w: 1.8, d: 1.5, h: 1.3 },
]

function Nearby({
  at: center,
  distance,
  children,
}: {
  at: [number, number]
  distance: number
  children: ReactNode
}) {
  const ref = useRef<Group>(null)
  useFrame(({ camera }) => {
    if (ref.current)
      ref.current.visible =
        (camera.position.x - center[0]) ** 2 +
          (camera.position.z - center[1]) ** 2 <
        distance * distance
  })
  return <group ref={ref}>{children}</group>
}

export function StreetLife() {
  return (
    <group name="street-life">
      <Nearby at={[-22, 18]} distance={95}>
        <PropBlocks batches={silhouettes} />
        <PropBlocks batches={parkedCargo} />
        <Blocks
          color="#ffeec2"
          unlit
          placements={parkedHeadlights.map((p) => ({
            ...p,
            scale: [0.26, 0.26, 0.12],
          }))}
        />
        <PropRounds bikes={bikes} pots={pots} tables={tables} />
        <ModelInstances path="nature/plant_bush" placements={bushPlacements} />
        <Nearby at={[-22, 18]} distance={58}>
          <ModelInstances path="food/pot" placements={foodPlacements} />
          <ModelInstances
            path="food/loaf-baguette"
            placements={breadPlacements}
          />
          <ModelInstances path="food/bowl-broth" placements={bowlPlacements} />
          <ModelInstances
            path="food/cup-coffee"
            placements={coffeePlacements}
          />
          <ModelInstances path="food/banana" placements={bananaPlacements} />
          <AlleyDetails />
        </Nearby>
      </Nearby>
      <Nearby at={[27, -9]} distance={65}>
        <ParkExercise />
      </Nearby>
      <Nearby at={[8, 12]} distance={60}>
        <CornerPlanters />
      </Nearby>
    </group>
  )
}

const shopSigns = [
  { x: -39, title: 'BÁNH XÈO', color: '#ae5148' },
  { x: -29, title: 'CÀ PHÊ VỈA HÈ', color: '#386d68' },
  { x: -18, title: 'BÚN THỊT NƯỚNG', color: '#ae5148' },
  { x: -7, title: 'CHÈ SÀI GÒN', color: '#386d68' },
]
const cables: Placement[] = [30.5, 34].flatMap((z) =>
  Array.from({ length: 12 }, (_, i) => {
    const x = -44 + i * 4
    const y = 4.9 - Math.sin((i / 11) * Math.PI) * 0.55
    return {
      position: [x + 2, y, z],
      scale: [4.05, 0.035, 0.035],
      rotation: [0, 0, Math.cos((i / 11) * Math.PI) * -0.035],
    }
  })
)
const flags = ['#dba055', '#b65b51', '#498579'].map((color, index) => ({
  color,
  placements: Array.from({ length: 5 }, (_, i) => ({
    position: [-41 + (i * 3 + index) * 3, 4.15, 30.5] as Vec3,
    scale: [0.9, 0.65, 0.025] as Vec3,
    rotation: [0, 0, i % 2 ? 0.1 : -0.08] as Vec3,
  })),
}))
const laundry = ['#edd6a9', '#b85a4d', '#3c776c'].map((color, index) => ({
  color,
  placements: [-38, -26, -14].map((x) => ({
    position: [x + index * 1.1, 4.2, 34] as Vec3,
    scale: [0.75, 1.1, 0.035] as Vec3,
    rotation: [0, 0.08, index % 2 ? 0.05 : -0.08] as Vec3,
  })),
}))

function AlleyDetails() {
  return (
    <group name="food-alley">
      <Blocks color="#44534e" placements={cables} />
      {flags.map(({ color, placements }) => (
        <Blocks key={color} color={color} placements={placements} />
      ))}
      {laundry.map(({ color, placements }) => (
        <Blocks key={color} color={color} placements={placements} />
      ))}
      {shopSigns.map(({ x, title, color }) => (
        <Sign
          key={title}
          text={title}
          position={[x, 2.3, 31.1]}
          rotation={[0, Math.PI, 0]}
          color={color}
          width={2.7}
          height={0.55}
        />
      ))}
      <Sign
        text="HẺM ẨM THỰC"
        subtitle="MÓN NGON · BẠN MỚI"
        position={[-1.5, 3.7, 30.3]}
        rotation={[0, -Math.PI / 2, 0]}
        width={3.3}
        height={0.9}
        color="#ae5148"
      />
      <Sign
        text="BÁNH MÌ NÓNG"
        position={[-34, 2.25, 3.9]}
        width={2.6}
        height={0.55}
        color="#ae5148"
      />
      <Sign
        text="NƯỚC MÍA"
        position={[-11, 2.25, 3.9]}
        width={2.6}
        height={0.55}
        color="#386d68"
      />
    </group>
  )
}

const exercise = assemble([
  {
    positions: [{ x: 20.5, z: -15.7 }],
    parts: [
      ...[-1.4, 1.4].map((x) =>
        part([x, 1.3, 0], [0.13, 2.6, 0.13], '#3c776c')
      ),
      part([0, 2.5, 0], [2.9, 0.12, 0.12], '#dba055'),
      part([-0.5, 1.9, 0], [0.7, 0.1, 0.1], '#dba055'),
    ],
  },
  {
    positions: [{ x: 35.3, z: -4.2 }],
    parts: [
      part([0, 0.6, 0], [0.13, 1.2, 0.13], '#3c776c'),
      part([0, 1.25, 0], [1.4, 0.12, 0.12], '#dba055'),
      ...[-0.65, 0.65].flatMap((x) => [
        part([x, 0.35, 0], [0.12, 0.65, 0.12], '#3c776c'),
        part([x, 0.12, 0.1], [0.6, 0.12, 0.8], '#dba055'),
      ]),
    ],
  },
])

function ParkExercise() {
  return (
    <group name="park-exercise">
      <PropBlocks batches={exercise} />
      <Blocks
        color="#c6b79a"
        placements={[
          { position: [20.5, 0.16, -15.7], scale: [3.6, 0.1, 1.5] },
          { position: [35.3, 0.16, -4.2], scale: [2.4, 0.1, 2] },
        ]}
      />
    </group>
  )
}

// Phase 5d: low corner planters framing the Lê Lợi junction where the xe ôm
// fragile-parcel wobble fires. Below knee height, no collider; purely scenery.
const planterBoxes = cornerPlanters.map((p) => ({
  position: [p.x, 0.22, p.z] as Vec3,
  scale: [1.1, 0.44, 1.1] as Vec3,
}))
const planterGreens = cornerPlanters.map((p) => at(p, [0, 0.6, 0], 1.6))

function CornerPlanters() {
  return (
    <group name="corner-planters">
      <Blocks color="#b89f78" placements={planterBoxes} />
      <ModelInstances path="nature/plant_bush" placements={planterGreens} />
    </group>
  )
}

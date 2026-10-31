import { useMemo } from 'react'
import { Model, ModelInstances, type Placement, type Vec3 } from './assets'
import { Bench } from './landmarks'
import { buildingRows } from './layout'
import { Block, Blocks, Sign } from './primitives'

export function Shophouses() {
  return (
    <group>
      {['a', 'c', 'e', 'f', 'g', 'j'].map((type) => (
        <ModelInstances
          key={type}
          path={`city/building-${type}`}
          placements={buildingRows
            .filter((row) => row.type === type)
            .map((row) => ({
              position: [row.x, 0, row.z],
              rotation: [0, row.yaw, 0],
              scale: row.scale,
            }))}
        />
      ))}
      <Sign
        text="CÀ PHÊ SỮA"
        position={[-30, 2.25, 20.7]}
        rotation={[0, Math.PI, 0]}
        width={4.1}
        height={0.85}
        color="#9f4d36"
      />
      <Sign
        text="BÁNH MÌ"
        position={[-20, 2.2, 20.7]}
        rotation={[0, Math.PI, 0]}
        width={3.8}
        height={0.75}
        color="#1c655f"
      />
      <Sign
        text="TIỆM SÁCH"
        position={[-4, 2.1, -30.9]}
        width={3.8}
        height={0.75}
        color="#b89650"
        ink="#293e39"
      />
      <ModelInstances
        path="city/detail-awning"
        placements={[-40, -30, -20, -10].map((x) => ({
          position: [x, 1.6, 20.8],
          rotation: [0, Math.PI, 0],
          scale: 8,
        }))}
      />
      <Model
        path="city/detail-parasol-a"
        position={[-32, 0.15, 18.5]}
        scale={4.5}
      />
      <Model
        path="city/detail-parasol-a"
        position={[-18, 0.15, 18.5]}
        scale={4.5}
      />
      <ModelInstances
        path="roads/electricity-pole"
        placements={[-40, -22, -4].map((x) => ({
          position: [x, 0, -28],
          scale: 6,
        }))}
      />
    </group>
  )
}
export function Planting() {
  const bushes = useMemo<Placement[]>(
    () => [
      ...Array.from({ length: 10 }, (_, i) => ({
        position: [16 + i * 2.3, 0.3, -17] as Vec3,
        scale: 3,
      })),
      ...[-37, -9].flatMap((x) =>
        [-22, -16, -10, -4].map((z) => ({
          position: [x, 0.25, z] as Vec3,
          scale: 2.5,
        }))
      ),
    ],
    []
  )
  return (
    <group>
      <ModelInstances path="nature/plant_bush" placements={bushes} />
      <ModelInstances
        path="nature/flower_redA"
        placements={Array.from({ length: 8 }, (_, i) => ({
          position: [33 + (i % 4) * 0.8, 0.3, -8 + Math.floor(i / 4) * 0.8],
          scale: 2.4,
        }))}
      />
      <ModelInstances
        path="nature/flower_yellowA"
        placements={Array.from({ length: 8 }, (_, i) => ({
          position: [18 + (i % 4) * 0.8, 0.3, -11 + Math.floor(i / 4) * 0.8],
          scale: 2.4,
        }))}
      />
    </group>
  )
}
export function Promenade() {
  return (
    <group>
      <Block position={[28, 0.02, 35]} scale={[154, 0.15, 7]} color="#c6b79a" />
      <Block
        position={[28, -0.35, 52]}
        scale={[214, 0.3, 26]}
        color="#5b9896"
      />
      <Blocks
        color="#ddcfaf"
        placements={Array.from({ length: 39 }, (_, i) => ({
          position: [-48 + i * 4, 0.6, 38],
          scale: [0.3, 1.2, 0.35],
        }))}
      />
      <Blocks
        color="#516b61"
        placements={[0.5, 1].map((y) => ({
          position: [28, y, 38],
          scale: [154, 0.09, 0.12],
        }))}
      />
      <Bench position={[24, 0, 33]} />
      <Bench position={[-27, 0, 35]} rotation={[0, Math.PI, 0]} />
      <Sign
        text="BẾN SÔNG"
        subtitle="SÀI GÒN, CHẬM MỘT CHÚT"
        position={[30, 1.8, 33]}
        width={3.7}
        height={0.9}
      />
      <Block
        position={[30, 0.7, 32.9]}
        scale={[0.15, 1.6, 0.15]}
        color="#6a755f"
      />
    </group>
  )
}
export function Crosswalk({ x, z }: { x: number; z: number }) {
  return (
    <Blocks
      color="#f0e9ce"
      placements={Array.from({ length: 7 }, (_, i) => ({
        position: [x - 1.8 + i * 0.6, 0.045, z],
        scale: [0.32, 0.02, 6.2],
      }))}
    />
  )
}
export function StopSign({
  position,
  rotation,
  name,
}: {
  position: Vec3
  rotation?: Vec3
  name: string
}) {
  return (
    <group position={position} rotation={rotation}>
      <Block position={[0, 1.2, 0]} scale={[0.12, 2.4, 0.12]} color="#46635a" />
      <Sign
        text={name}
        subtitle="TUYẾN 01   •   CITY LOOP"
        position={[0, 2.4, 0.08]}
        width={2.8}
        height={0.75}
      />
      <Block position={[0, 0.04, 0]} scale={[3.2, 0.08, 1.5]} color="#e4c47c" />
    </group>
  )
}

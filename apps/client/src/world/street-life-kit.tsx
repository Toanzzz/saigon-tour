import { useEffect, useRef } from 'react'
import {
  type BufferGeometry,
  CylinderGeometry,
  type InstancedMesh,
  MeshStandardMaterial,
  Object3D,
  TorusGeometry,
} from 'three'
import type { Placement, Vec3 } from './assets'
import { Blocks } from './primitives'

export type StreetPlacement = { x: number; z: number; yaw?: number }
export type PropPart = {
  position: Vec3
  scale: Vec3
  color: string
  rotation?: Vec3
}
type Assembly = {
  positions: StreetPlacement[]
  parts: PropPart[] | ((index: number) => PropPart[])
}

export function at(
  placement: StreetPlacement,
  offset: Vec3,
  scale: number | Vec3 = 1,
  rotation: Vec3 = [0, 0, 0]
): Placement {
  const yaw = placement.yaw ?? 0
  const c = Math.cos(yaw)
  const s = Math.sin(yaw)
  return {
    position: [
      placement.x + offset[0] * c + offset[2] * s,
      offset[1],
      placement.z - offset[0] * s + offset[2] * c,
    ],
    scale,
    rotation: [rotation[0], yaw + rotation[1], rotation[2]],
  }
}

export function part(
  position: Vec3,
  scale: Vec3,
  color: string,
  rotation?: Vec3
): PropPart {
  return { position, scale, color, rotation }
}

export function assemble(assemblies: Assembly[]) {
  const batches = new Map<string, Placement[]>()
  for (const assembly of assemblies) {
    assembly.positions.forEach((position, i) => {
      const parts =
        typeof assembly.parts === 'function'
          ? assembly.parts(i)
          : assembly.parts
      for (const value of parts) {
        const batch = batches.get(value.color) ?? []
        batch.push(at(position, value.position, value.scale, value.rotation))
        batches.set(value.color, batch)
      }
    })
  }
  return [...batches].map(([color, placements]) => ({ color, placements }))
}

export function PropBlocks({
  batches,
}: {
  batches: ReturnType<typeof assemble>
}) {
  return batches.map(({ color, placements }) => (
    <Blocks key={color} color={color} placements={placements} />
  ))
}

const wheel = new TorusGeometry(1, 0.2, 5, 12)
const pot = new CylinderGeometry(0.43, 0.3, 0.6, 8)
const tabletop = new CylinderGeometry(0.67, 0.67, 0.13, 12)
const tireMaterial = new MeshStandardMaterial({
  color: '#34403c',
  roughness: 0.95,
})
const potMaterial = new MeshStandardMaterial({
  color: '#b97454',
  roughness: 0.9,
})
const tableMaterial = new MeshStandardMaterial({
  color: '#e1c495',
  roughness: 0.9,
})

function RoundInstances({
  geometry,
  material,
  placements,
}: {
  geometry: BufferGeometry
  material: MeshStandardMaterial
  placements: Placement[]
}) {
  const ref = useRef<InstancedMesh>(null)
  useEffect(() => {
    if (!ref.current) return
    const object = new Object3D()
    placements.forEach((placement, i) => {
      object.position.set(...placement.position)
      object.rotation.set(...(placement.rotation ?? [0, 0, 0]))
      const scale = placement.scale ?? 1
      typeof scale === 'number'
        ? object.scale.setScalar(scale)
        : object.scale.set(...scale)
      object.updateMatrix()
      ref.current?.setMatrixAt(i, object.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
    ref.current.computeBoundingSphere()
  }, [placements])
  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, placements.length]}
      receiveShadow
      dispose={null}
    />
  )
}

export function PropRounds({
  bikes,
  pots,
  tables,
}: {
  bikes: StreetPlacement[]
  pots: StreetPlacement[]
  tables: StreetPlacement[]
}) {
  return (
    <>
      <RoundInstances
        geometry={wheel}
        material={tireMaterial}
        placements={bikes.flatMap((bike) =>
          [-0.75, 0.75].map((z) =>
            at(bike, [0, 0.43, z], 0.37, [0, Math.PI / 2, 0])
          )
        )}
      />
      <RoundInstances
        geometry={pot}
        material={potMaterial}
        placements={pots.map((plant) => at(plant, [0, 0.3, 0]))}
      />
      <RoundInstances
        geometry={tabletop}
        material={tableMaterial}
        placements={tables.map((table) => at(table, [0, 0.98, 0]))}
      />
    </>
  )
}

const green = '#3c776c'
const red = '#b85a4d'
const cream = '#edd6a9'
const dark = '#445c53'

export const BIKE_PARTS = (i: number) => [
  part([0, 0.66, 0], [0.4, 0.32, 1.5], i % 2 ? red : green),
  part([0, 0.94, -0.37], [0.52, 0.17, 0.85], dark),
  part([0, 1, 0.61], [0.28, 0.7, 0.18], i % 2 ? red : green, [-0.18, 0, 0]),
  part([0, 1.32, 0.54], [0.76, 0.08, 0.1], dark),
  part([0, 1.17, 0.78], [0.25, 0.2, 0.09], cream),
  ...(i % 3 === 0 ? [part([0, 1.2, -0.8], [0.65, 0.52, 0.55], '#c3915d')] : []),
]

export const CART_PARTS = (i: number) => [
  part([0, 0.68, 0], [2.6, 1.15, 1.25], i % 2 ? green : red),
  part([0, 1.3, 0], [2.85, 0.15, 1.4], cream),
  ...[-1.2, 1.2].map((x) => part([x, 1.9, -0.48], [0.09, 2.7, 0.09], dark)),
  part([0, 2.8, -0.05], [3.2, 0.13, 1.95], cream, [0.1, 0, 0]),
  ...[-1.25, -0.65, 0, 0.65, 1.25].map((x) =>
    part(
      [x, 2.87, -0.05],
      [0.28, 0.035, 1.95],
      i % 2 ? red : green,
      [0.1, 0, 0]
    )
  ),
  ...[-0.95, 0.95].map((x) => part([x, 0.18, 0], [0.18, 0.33, 0.9], dark)),
]

export const STOOL_PARTS = (i: number) => [
  part([0, 0.55, 0], [0.5, 0.13, 0.5], i % 2 ? red : green),
  ...[-0.18, 0.18].flatMap((x) =>
    [-0.18, 0.18].map((z) =>
      part([x, 0.27, z], [0.07, 0.5, 0.07], i % 2 ? red : green)
    )
  ),
]

export const TABLE_PARTS = [
  part([0, 0.48, 0], [0.11, 0.9, 0.11], dark),
  part([0, 0.08, 0], [0.85, 0.08, 0.14], dark),
  part([0, 0.08, 0], [0.14, 0.08, 0.85], dark),
]

export const BOX_PARTS = [
  part([0, 0.27, 0], [0.7, 0.54, 0.58], '#c3915d'),
  part([0, 0.55, 0], [0.12, 0.025, 0.6], cream),
]

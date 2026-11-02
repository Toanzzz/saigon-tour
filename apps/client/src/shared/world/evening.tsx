import { useMemo } from 'react'
import { BoxGeometry, Matrix4, MeshBasicMaterial, Object3D } from 'three'
import { Blocks } from './primitives'

const GLOW = '#ffd88a'
const GLOW_GEOMETRY = new BoxGeometry(1, 1, 1)
const GLOW_MATERIAL = new MeshBasicMaterial({
  color: GLOW,
  toneMapped: false,
})
const GLOW_OBJECT = new Object3D()
const GLOW_MATRIX = new Matrix4()

const marketLamps = [
  {
    position: [-39, 3.3, 6.3] as [number, number, number],
    scale: [0.22, 0.6, 0.22] as [number, number, number],
  },
  {
    position: [-30, 3.3, 6.3] as [number, number, number],
    scale: [0.22, 0.6, 0.22] as [number, number, number],
  },
  {
    position: [-12, 3.3, 6.3] as [number, number, number],
    scale: [0.22, 0.6, 0.22] as [number, number, number],
  },
  {
    position: [-3, 3.3, 6.3] as [number, number, number],
    scale: [0.22, 0.6, 0.22] as [number, number, number],
  },
]
const alleyLamps = [
  {
    position: [-38, 4.2, 30.6] as [number, number, number],
    scale: [0.18, 0.5, 0.18] as [number, number, number],
  },
  {
    position: [-26, 4.2, 30.6] as [number, number, number],
    scale: [0.18, 0.5, 0.18] as [number, number, number],
  },
  {
    position: [-14, 4.2, 30.6] as [number, number, number],
    scale: [0.18, 0.5, 0.18] as [number, number, number],
  },
  {
    position: [-2, 4.2, 30.6] as [number, number, number],
    scale: [0.18, 0.5, 0.18] as [number, number, number],
  },
]
const riverLamps = [
  {
    position: [46, 3.3, 37.4] as [number, number, number],
    scale: [0.2, 0.52, 0.2] as [number, number, number],
  },
  {
    position: [58, 3.3, 37.4] as [number, number, number],
    scale: [0.2, 0.52, 0.2] as [number, number, number],
  },
  {
    position: [78, 3.3, 37.4] as [number, number, number],
    scale: [0.2, 0.52, 0.2] as [number, number, number],
  },
  {
    position: [93, 3.3, 37.4] as [number, number, number],
    scale: [0.2, 0.52, 0.2] as [number, number, number],
  },
]

export function EveningLighting({ active = true }: { active?: boolean }) {
  const lamps = useMemo(
    () => [...marketLamps, ...alleyLamps, ...riverLamps],
    []
  )
  if (!active) return null
  return (
    <group name="evening-lighting">
      <pointLight
        position={[-24, 4.6, 17]}
        color="#ffb36b"
        intensity={2.2}
        distance={27}
        decay={2}
      />
      <pointLight
        position={[58, 4.6, 37]}
        color="#8bd6d0"
        intensity={1.8}
        distance={32}
        decay={2}
      />
      <instancedMesh
        args={[GLOW_GEOMETRY, GLOW_MATERIAL, lamps.length]}
        ref={(mesh) => {
          if (!mesh) return
          lamps.forEach((lamp, index) => {
            mesh.setMatrixAt(index, matrixFor(lamp.position, lamp.scale))
          })
          mesh.instanceMatrix.needsUpdate = true
        }}
        frustumCulled
      />
      <Blocks
        unlit
        color="#ff9c62"
        placements={[
          { position: [-23, 2.3, 3.4], scale: [4.3, 0.08, 0.08] },
          { position: [-23, 2.3, 31.3], scale: [3.3, 0.08, 0.08] },
          { position: [52, 2.2, 37.2], scale: [3.6, 0.08, 0.08] },
        ]}
      />
    </group>
  )
}

function matrixFor(
  position: [number, number, number],
  scale: [number, number, number]
) {
  GLOW_OBJECT.position.set(...position)
  GLOW_OBJECT.scale.set(...scale)
  GLOW_OBJECT.updateMatrix()
  GLOW_MATRIX.copy(GLOW_OBJECT.matrix)
  return GLOW_MATRIX
}

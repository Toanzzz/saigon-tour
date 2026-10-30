import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  AnimationMixer,
  Color,
  type InstancedMesh,
  type Material,
  Matrix4,
  Mesh,
  Object3D,
} from 'three'
import { clone } from 'three/addons/utils/SkeletonUtils.js'

export type Vec3 = [number, number, number]
export type Placement = {
  position: Vec3
  rotation?: Vec3
  scale?: number | Vec3
}
export const modelUrl = (path: string) =>
  `${import.meta.env.BASE_URL}models/${path}.glb`
/** Runtime models are Draco-compressed; the decoder is self-hosted. */
const DRACO = `${import.meta.env.BASE_URL}draco/`
const loadModel = (path: string) => useGLTF(modelUrl(path), DRACO)

const CITY_TINTS: Record<string, string> = {
  'city/building-a': '#f0d6b2',
  'city/building-c': '#e9c7a8',
  'city/building-e': '#eed8bd',
  'city/building-f': '#e0c2a5',
  'city/building-g': '#f2d9b8',
  'city/building-j': '#dcc4ad',
}

function prepareMeshMaterial(mesh: Mesh, path: string) {
  const foliage = path.startsWith('nature/')
  const tint = CITY_TINTS[path]
  if (!foliage && !tint) return
  const cloneMaterial = (source: Material) => {
    const material = source.clone()
    if (foliage && 'metalness' in material) {
      ;(material as { metalness: number }).metalness = 0
    }
    if (tint && 'color' in material) {
      ;(material as { color: Color }).color.lerp(new Color(tint), 0.18)
    }
    return material
  }
  mesh.material = Array.isArray(mesh.material)
    ? mesh.material.map(cloneMaterial)
    : cloneMaterial(mesh.material)
}

function prepareScene(scene: Object3D, path: string) {
  scene.traverse((child) => {
    if (child instanceof Mesh) prepareMeshMaterial(child, path)
  })
}

export function Model({
  path,
  position = [0, 0, 0],
  rotation,
  scale = 1,
  shadow = true,
}: {
  path: string
  position?: Vec3
  rotation?: Vec3
  scale?: number | Vec3
  shadow?: boolean
}) {
  const { scene } = loadModel(path)
  const object = useMemo(() => {
    const value = scene.clone(true)
    prepareScene(value, path)
    value.traverse((child) => {
      if (child instanceof Mesh) {
        child.castShadow = shadow
        child.receiveShadow = true
      }
    })
    return value
  }, [path, scene, shadow])
  return (
    <primitive
      object={object}
      position={position}
      rotation={rotation}
      scale={scale}
      dispose={null}
    />
  )
}

export function ModelInstances({
  path,
  placements,
  shadow = true,
}: {
  path: string
  placements: Placement[]
  shadow?: boolean
}) {
  const { scene } = loadModel(path)
  const meshes = useMemo(() => {
    scene.updateMatrixWorld(true)
    prepareScene(scene, path)
    const result: Mesh[] = []
    scene.traverse((child) => {
      if (child instanceof Mesh) result.push(child)
    })
    return result
  }, [path, scene])
  return (
    <group>
      {meshes.map((mesh) => (
        <Instances
          key={mesh.uuid}
          mesh={mesh}
          placements={placements}
          shadow={shadow}
        />
      ))}
    </group>
  )
}

function Instances({
  mesh,
  placements,
  shadow,
}: {
  mesh: Mesh
  placements: Placement[]
  shadow: boolean
}) {
  const ref = useRef<InstancedMesh>(null)
  useEffect(() => {
    if (!ref.current) return
    const object = new Object3D()
    const matrix = new Matrix4()
    placements.forEach((placement, index) => {
      object.position.set(...placement.position)
      object.rotation.set(...(placement.rotation ?? [0, 0, 0]))
      const scale = placement.scale ?? 1
      typeof scale === 'number'
        ? object.scale.setScalar(scale)
        : object.scale.set(...scale)
      object.updateMatrix()
      ref.current?.setMatrixAt(
        index,
        matrix.multiplyMatrices(object.matrix, mesh.matrixWorld)
      )
    })
    ref.current.instanceMatrix.needsUpdate = true
    ref.current.computeBoundingSphere()
  }, [mesh, placements])
  return (
    <instancedMesh
      ref={ref}
      args={[mesh.geometry, mesh.material, placements.length]}
      castShadow={shadow}
      receiveShadow
      dispose={null}
    />
  )
}

export function Character({
  model = 'female-b',
  path,
  position = [0, 0, 0],
  rotation,
  animation = 'idle',
  scale = 2.35,
}: {
  model?: 'female-a' | 'female-b' | 'male-a' | 'male-b'
  /** Runtime model path override, e.g. the tourist player. */
  path?: string
  position?: Vec3
  rotation?: Vec3
  animation?: string
  scale?: number
}) {
  const { scene, animations } = loadModel(path ?? `people/character-${model}`)
  const object = useMemo(() => {
    const result = clone(scene)
    result.traverse((child) => {
      if (child instanceof Mesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
    return result
  }, [scene])
  const mixer = useMemo(() => new AnimationMixer(object), [object])
  useEffect(() => {
    const clip =
      animations.find((candidate) => candidate.name === animation) ??
      animations.find((candidate) => candidate.name === 'idle')
    if (!clip) return
    const action = mixer.clipAction(clip).reset().fadeIn(0.2).play()
    return () => {
      action.fadeOut(0.2)
    }
  }, [animation, animations, mixer])
  useEffect(
    () => () => {
      mixer.stopAllAction()
      mixer.uncacheRoot(object)
    },
    [mixer, object]
  )
  useFrame((_, delta) => mixer.update(Math.min(delta, 0.05)))
  return (
    <primitive
      object={object}
      position={position}
      rotation={rotation}
      scale={scale}
      dispose={null}
    />
  )
}

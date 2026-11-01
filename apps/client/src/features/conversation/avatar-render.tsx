import { useGLTF } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { useSelector } from '@tanstack/react-store'
import { Store } from '@tanstack/store'
import { Suspense, useEffect, useMemo } from 'react'
import { Box3, Color, type Material, Mesh, Vector3 } from 'three'
import { clone } from 'three/addons/utils/SkeletonUtils.js'
import { modelUrl } from '@/shared/world'

type Job = { key: string; model: string; color: string }

const DRACO = `${import.meta.env.BASE_URL}draco/`
const cache = new Store<Record<string, string>>({})
const queue = new Store<Job[]>([])

export const avatarKey = (model: string, color: string) => `${model}|${color}`
export const useAvatar = (key: string) =>
  useSelector(cache, (state) => state[key])

/** Ask the offscreen renderer for one head portrait; cached after the first draw. */
export function requestAvatar(model: string, color: string) {
  const key = avatarKey(model, color)
  if (cache.state[key] || queue.state.some((job) => job.key === key)) return key
  queue.setState((jobs) => [...jobs, { key, model, color }])
  return key
}

function Head({ job, onDone }: { job: Job; onDone: (url: string) => void }) {
  const { scene } = useGLTF(modelUrl(`people/character-${job.model}`), DRACO)
  const { gl, scene: root, camera } = useThree()
  const object = useMemo(() => {
    const result = clone(scene)
    result.traverse((child) => {
      if (child instanceof Mesh) {
        const tint = (source: Material) => {
          const material = source.clone()
          if ('color' in material)
            (material as Material & { color: Color }).color.lerp(
              new Color(job.color),
              0.4
            )
          return material
        }
        child.material = Array.isArray(child.material)
          ? child.material.map(tint)
          : tint(child.material)
      }
    })
    return result
  }, [scene, job.color])
  useEffect(() => {
    root.add(object)
    const box = new Box3().setFromObject(object)
    const size = new Vector3()
    const center = new Vector3()
    box.getSize(size)
    box.getCenter(center)
    // Frame head and shoulders: upper slice of the model, filling the square.
    const focusY = box.max.y - size.y * 0.22
    const span = size.y * 0.46
    camera.position.set(center.x, focusY, span * 2.5)
    camera.lookAt(center.x, focusY, 0)
    camera.updateProjectionMatrix()
    gl.render(root, camera)
    const url = gl.domElement.toDataURL('image/webp', 0.9)
    onDone(url)
    root.remove(object)
    object.traverse((child) => {
      if (child instanceof Mesh) {
        const materials = Array.isArray(child.material)
          ? child.material
          : [child.material]
        for (const material of materials) material.dispose()
      }
    })
  }, [object, gl, root, camera, onDone])
  return null
}

/** Single hidden WebGL context that bakes NPC head portraits to data URLs. */
export function AvatarRenderer() {
  const jobs = useSelector(queue, (state) => state)
  const job = jobs[0]
  if (!job) return null
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        width: 128,
        height: 128,
        left: -9999,
        top: -9999,
        pointerEvents: 'none',
      }}
    >
      <Canvas
        gl={{ preserveDrawingBuffer: true, alpha: true, antialias: true }}
        dpr={2}
        camera={{ fov: 32, near: 0.1, far: 50 }}
        frameloop="demand"
      >
        <color attach="background" args={['#f6e5aa']} />
        <hemisphereLight args={['#fff3d5', '#7e8976', 2.4]} />
        <directionalLight position={[2, 4, 3]} intensity={1.3} />
        <Suspense fallback={null}>
          <Head
            key={job.key}
            job={job}
            onDone={(url) => {
              cache.setState((state) => ({ ...state, [job.key]: url }))
              queue.setState((rest) => rest.slice(1))
            }}
          />
        </Suspense>
      </Canvas>
    </div>
  )
}

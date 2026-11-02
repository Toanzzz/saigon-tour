import { useEffect, useMemo, useRef } from 'react'
import {
  BoxGeometry,
  CanvasTexture,
  type InstancedMesh,
  type Material,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  SRGBColorSpace,
} from 'three'
import type { Placement, Vec3 } from './assets'
import { LOOK, type WorldLook } from './look-flag'
import { toToon } from './toon'

const box = new BoxGeometry(1, 1, 1)
/** Lit block materials, cached per colour AND look so toon and classic never mix. */
const materialCache = new Map<string, Material>()
/** Pure resolver, exported for tests so both looks can be exercised. */
export function blockMaterial(color: string, look: WorldLook) {
  const key = `${look}:${color}`
  let value = materialCache.get(key)
  if (!value) {
    const standard = new MeshStandardMaterial({ color, roughness: 0.88 })
    value = look === 'comic' ? toToon(standard) : standard
    materialCache.set(key, value)
  }
  return value
}
function material(color: string) {
  return blockMaterial(color, LOOK)
}

/** Unlit glow block materials: Basic + `toneMapped={false}`, toon-exempt. */
const glowCache = new Map<string, MeshBasicMaterial>()
export function glowMaterial(color: string) {
  let value = glowCache.get(color)
  if (!value) {
    value = new MeshBasicMaterial({ color, toneMapped: false })
    value.userData.unlit = true
    glowCache.set(color, value)
  }
  return value
}

export function Block({
  position,
  scale,
  color,
  rotation,
  shadow = false,
  unlit = false,
}: {
  position: Vec3
  scale: Vec3
  color: string
  rotation?: Vec3
  shadow?: boolean
  unlit?: boolean
}) {
  return (
    <mesh
      geometry={box}
      material={unlit ? glowMaterial(color) : material(color)}
      position={position}
      scale={scale}
      rotation={rotation}
      castShadow={shadow}
      receiveShadow
      dispose={null}
    />
  )
}
export function Blocks({
  placements,
  color,
  shadow = false,
  unlit = false,
}: {
  placements: Placement[]
  color: string
  shadow?: boolean
  unlit?: boolean
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
      args={[
        box,
        unlit ? glowMaterial(color) : material(color),
        placements.length,
      ]}
      castShadow={shadow}
      receiveShadow
      dispose={null}
    />
  )
}
export function Sign({
  text,
  subtitle,
  position,
  rotation = [0, 0, 0],
  width = 3.2,
  height = 0.8,
  color = '#1f625d',
  ink = '#fff3d6',
}: {
  text: string
  subtitle?: string
  position: Vec3
  rotation?: Vec3
  width?: number
  height?: number
  color?: string
  ink?: string
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 768
    canvas.height = 192
    const context = canvas.getContext('2d')
    if (!context) return new CanvasTexture(canvas)
    context.fillStyle = color
    context.fillRect(0, 0, 768, 192)
    context.strokeStyle = ink
    context.lineWidth = 3
    context.strokeRect(10, 10, 748, 172)
    context.fillStyle = ink
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.font = 'bold 66px Georgia, serif'
    context.fillText(text, 384, subtitle ? 75 : 98, 710)
    if (subtitle) {
      context.font = '24px Arial, sans-serif'
      context.fillText(subtitle, 384, 139, 710)
    }
    const result = new CanvasTexture(canvas)
    result.colorSpace = SRGBColorSpace
    return result
  }, [text, subtitle, color, ink])
  useEffect(() => () => texture.dispose(), [texture])
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  )
}

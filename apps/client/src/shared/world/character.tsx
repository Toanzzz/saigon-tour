import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { type AvatarBody, bodyModel, type Look, UNLOCKS } from '@saigon/shared'
import { Suspense, useEffect, useMemo, useRef } from 'react'
import {
  type AnimationAction,
  AnimationMixer,
  Color,
  type Material,
  Mesh,
  type Object3D,
} from 'three'
import { clone } from 'three/addons/utils/SkeletonUtils.js'
import { ActivityProp } from './activity-prop'
import type { Vec3 } from './assets'
import { modelUrl } from './assets'
import { applyOutfitPalette, attachCosmetic, CLOTHING } from './look'
import { LOOK } from './look-flag'
import { toToon } from './toon'

/** Runtime models are Draco-compressed; the decoder is self-hosted. */
const DRACO = `${import.meta.env.BASE_URL}draco/`
const loadModel = (path: string) => useGLTF(modelUrl(path), DRACO)

export function Character({
  model = 'female-b',
  path,
  position = [0, 0, 0],
  rotation,
  animation = 'idle',
  activityProp,
  scale = 2.35,
  color,
  active,
  shadow = true,
  look,
  body = 'man',
  frozen = false,
}: {
  model?: 'female-a' | 'female-b' | 'male-a' | 'male-b'
  /** Runtime model path override, e.g. a player body. */
  path?: string
  position?: Vec3
  rotation?: Vec3
  animation?: string | (() => string)
  activityProp?: string
  scale?: number
  color?: string
  /** Nearby actors can suspend their mixer without removing their pose. */
  active?: () => boolean
  shadow?: boolean
  /** Equipped cosmetics/outfit to render on the avatar. */
  look?: Look | null
  body?: AvatarBody
  frozen?: boolean
}) {
  const { scene, animations } = loadModel(path ?? `people/character-${model}`)
  const object = useMemo(() => {
    const result = clone(scene)
    result.traverse((child) => {
      if (child instanceof Mesh) {
        child.castShadow = shadow
        child.receiveShadow = true
        if (color) {
          const tint = (source: Material) => {
            // The remote-player tint only recolours clothing, never skin or face.
            if (!CLOTHING.has(source.name)) return source
            const material = source.clone()
            if ('color' in material)
              (material as Material & { color: Color }).color.lerp(
                new Color(color),
                0.45
              )
            return material
          }
          child.material = Array.isArray(child.material)
            ? child.material.map(tint)
            : tint(child.material)
        }
        // Toon the result; outfit palettes clone this toon material afterwards.
        if (LOOK === 'comic') {
          child.material = Array.isArray(child.material)
            ? child.material.map(toToon)
            : toToon(child.material)
        }
      }
    })
    applyOutfitPalette(result, look)
    return result
  }, [scene, color, shadow, look])
  useEffect(
    () => () => {
      if (!color) return
      object.traverse((child) => {
        if (child instanceof Mesh) {
          const materials = Array.isArray(child.material)
            ? child.material
            : [child.material]
          for (const material of materials) material.dispose()
        }
      })
    },
    [object, color]
  )
  const mixer = useMemo(() => new AnimationMixer(object), [object])
  const playing = useRef<{ name: string; action: AnimationAction } | null>(null)
  useEffect(() => {
    playing.current = null
    return () => {
      mixer.stopAllAction()
      mixer.uncacheRoot(object)
    }
  }, [mixer, object])
  useFrame((_, delta) => {
    const name = typeof animation === 'function' ? animation() : animation
    if (playing.current?.name !== name) {
      const clip =
        animations.find((candidate) => candidate.name === name) ??
        animations.find((candidate) => candidate.name === 'idle')
      if (clip) {
        if (frozen) playing.current?.action.stop()
        else playing.current?.action.fadeOut(0.2)
        const action = mixer.clipAction(clip).reset()
        if (frozen) action.setEffectiveWeight(1).play()
        else action.fadeIn(0.2).play()
        playing.current = { name, action }
        mixer.update(0)
        object.userData.activeAnimation = clip.name
      }
    }
    if (!frozen && (!active || active())) mixer.update(Math.min(delta, 0.05))
    object.userData.animationTime = playing.current?.action.time ?? 0
  })
  const cosmetics = look
    ? ([look.hat, look.accessory].filter(Boolean) as string[]).filter(
        (id) => UNLOCKS[id]?.model
      )
    : []
  return (
    <primitive
      object={object}
      position={position}
      rotation={rotation}
      scale={scale}
      dispose={null}
    >
      {activityProp && (
        <Suspense fallback={null}>
          <ActivityProp root={object} path={activityProp} />
        </Suspense>
      )}
      {cosmetics.map((id) => (
        <Cosmetic key={id} id={id} root={object} body={body} />
      ))}
    </primitive>
  )
}

/** Load one cosmetic GLB and attach it to the avatar's bone. */
function Cosmetic({
  id,
  root,
  body,
}: {
  id: string
  root: Object3D
  body: AvatarBody
}) {
  const path = UNLOCKS[id]?.model
  const { scene } = loadModel(path ?? 'cosmetics/non-la')
  useEffect(() => {
    if (!path) return
    const piece = clone(scene)
    piece.traverse((child) => {
      if (child instanceof Mesh) {
        child.castShadow = true
        child.receiveShadow = true
        if (LOOK === 'comic')
          child.material = Array.isArray(child.material)
            ? child.material.map(toToon)
            : toToon(child.material)
      }
    })
    attachCosmetic(root, id, piece, body)
    return () => {
      piece.removeFromParent()
    }
  }, [id, path, root, scene, body])
  return null
}

/** The plain player body plus its equipped look, by chosen body type. */
export function Avatar({
  body,
  look,
  animation = 'idle',
  position = [0, 0, 0],
  rotation,
  scale = 2.35,
  color,
  active,
  shadow = true,
  frozen = false,
}: {
  body: AvatarBody
  look?: Look | null
  animation?: string
  position?: Vec3
  rotation?: Vec3
  scale?: number
  color?: string
  active?: () => boolean
  shadow?: boolean
  frozen?: boolean
}) {
  return (
    <Character
      path={
        (look?.outfit && UNLOCKS[look.outfit]?.outfitModels?.[body]) ||
        bodyModel(body)
      }
      body={body}
      frozen={frozen}
      look={look}
      animation={animation}
      position={position}
      rotation={rotation}
      scale={scale}
      color={color}
      active={active}
      shadow={shadow}
    />
  )
}

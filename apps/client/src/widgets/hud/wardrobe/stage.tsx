import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { type AvatarBody, bodyModel, type Look, UNLOCKS } from '@saigon/shared'
import { type ComponentRef, useEffect, useRef } from 'react'
import {
  Box3,
  BoxHelper,
  type Group,
  type PerspectiveCamera,
  SkeletonHelper,
  Vector3,
} from 'three'
import { m } from '@/shared/i18n'
import {
  Avatar,
  AvatarLights,
  Character,
  PersonalVehicle,
} from '@/shared/world'
import { lookModelPaths } from '@/shared/world/look'
import { riderPosition } from '@/shared/world/vehicles'
import { ViewSlot } from './view-slot'

export interface WardrobeStageProps {
  body: AvatarBody
  look: Look
  animation?: 'idle' | 'walk' | 'sprint' | 'sit'
  frozen?: boolean
  bounds?: boolean
  anchors?: boolean
  view?: 'front' | 'side' | 'back'
}

function PreviewView({
  root,
  identity,
  view,
}: {
  root: React.RefObject<Group | null>
  identity: string
  view: 'front' | 'side' | 'back'
}) {
  const { camera, size, controls } = useThree()
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!root.current) return
      root.current.userData.previewIdentity = identity
      root.current.updateMatrixWorld(true)
      const box = new Box3().setFromObject(root.current, true)
      if (box.isEmpty()) return
      const extent = box.getSize(new Vector3())
      const center = box.getCenter(new Vector3())
      const lens = camera as PerspectiveCamera
      const halfFov = Math.tan((lens.fov * Math.PI) / 360)
      const distance =
        Math.max(
          extent.y / (2 * halfFov),
          Math.max(extent.x, extent.z) /
            (2 * halfFov * (size.width / size.height))
        ) *
          1.18 +
        extent.z / 2
      camera.position.set(center.x, center.y, center.z + distance)
      lens.near = 0.01
      lens.far = 100
      lens.updateProjectionMatrix()
      const orbit = controls as ComponentRef<typeof OrbitControls> | null
      orbit?.target.copy(center)
      orbit?.update()
      orbit?.setAzimuthalAngle(
        view === 'side' ? Math.PI / 2 : view === 'back' ? Math.PI : 0
      )
    }, 180)
    return () => clearTimeout(timer)
  }, [root, identity, camera, controls, size.width, size.height, view])
  return null
}

function InspectGeometry({
  root,
  bounds,
  anchors,
}: {
  root: React.RefObject<Group | null>
  bounds: boolean
  anchors: boolean
}) {
  const helpers = useRef<(BoxHelper | SkeletonHelper)[]>([])
  useEffect(() => {
    const object = root.current
    if (!object) return
    helpers.current = [
      ...(bounds ? [new BoxHelper(object, '#df7843')] : []),
      ...(anchors ? [new SkeletonHelper(object)] : []),
    ]
    for (const helper of helpers.current) {
      helper.renderOrder = 20
      for (const material of Array.isArray(helper.material)
        ? helper.material
        : [helper.material])
        material.depthTest = false
      object.parent?.add(helper)
    }
    return () => {
      for (const helper of helpers.current) {
        helper.removeFromParent()
        helper.dispose()
      }
      helpers.current = []
    }
  }, [root, bounds, anchors])
  useFrame(() => {
    for (const helper of helpers.current)
      if (helper instanceof BoxHelper) helper.update()
  })
  return null
}

/** Shared fitted composition for the live wardrobe and the local inspector. */
export function WardrobeStage({
  body,
  look,
  animation = 'idle',
  frozen = false,
  bounds = false,
  anchors = false,
  view = 'front',
}: WardrobeStageProps) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null)
  const root = useRef<Group>(null)
  const vehicle = look.vehicle
  const pet = look.pet ? UNLOCKS[look.pet] : undefined
  return (
    <section className="wardrobe-stage">
      <ViewSlot
        className="wardrobe-stage-view"
        modelPaths={[
          (look.outfit && UNLOCKS[look.outfit]?.outfitModels?.[body]) ||
            bodyModel(body),
          ...lookModelPaths(look),
          ...(pet?.model ? [pet.model] : []),
          ...(vehicle && UNLOCKS[vehicle]?.model
            ? [UNLOCKS[vehicle].model as string]
            : []),
        ]}
      >
        <AvatarLights />
        <OrbitControls
          ref={controls}
          makeDefault
          enableZoom
          enablePan={false}
          minDistance={1}
          maxDistance={12}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={(Math.PI * 2) / 3}
          rotateSpeed={0.8}
        />
        <PreviewView
          root={root}
          identity={`${body}:${animation}:${JSON.stringify(look)}`}
          view={view}
        />
        <group ref={root} position={[0, -0.8, 0]} name="wardrobe-composition">
          <Avatar
            body={body}
            look={look}
            animation={vehicle ? 'drive' : animation}
            position={vehicle ? riderPosition(vehicle) : undefined}
            frozen={frozen}
            shadow={false}
          />
          {vehicle && <PersonalVehicle id={vehicle} />}
          {pet?.model && (
            <Character
              path={pet.model}
              position={[1.15, 0, 0]}
              animation={animation === 'sprint' ? 'run' : animation}
              scale={(pet.scale ?? 0.5) * 2.35}
              frozen={frozen}
              shadow={false}
            />
          )}
        </group>
        <InspectGeometry root={root} bounds={bounds} anchors={anchors} />
      </ViewSlot>
      <button
        type="button"
        className="wardrobe-tab"
        aria-label={m.wardrobe_rotate()}
        onClick={() => {
          const orbit = controls.current
          if (orbit) orbit.setAzimuthalAngle(orbit.getAzimuthalAngle() + 0.3)
        }}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
          event.preventDefault()
          event.stopPropagation()
          const orbit = controls.current
          if (orbit)
            orbit.setAzimuthalAngle(
              orbit.getAzimuthalAngle() +
                (event.key === 'ArrowLeft' ? -0.2 : 0.2)
            )
        }}
      >
        {m.wardrobe_rotate()}
      </button>
      <small>{m.wardrobe_rotate_hint()}</small>
    </section>
  )
}

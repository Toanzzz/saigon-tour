import { OrbitControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import type { AvatarBody, Look } from '@saigon/shared'
import { UNLOCKS } from '@saigon/shared'
import { type ComponentRef, useEffect, useRef } from 'react'
import type { PerspectiveCamera } from 'three'
import { m } from '@/shared/i18n'
import {
  AvatarLights,
  AvatarTurntable,
  Model,
  PersonalVehicle,
} from '@/shared/world'
import { ViewSlot } from './view-slot'

function PreviewCamera({
  companions,
  hat,
}: {
  companions: boolean
  hat: boolean
}) {
  const { camera, controls, size } = useThree()
  useEffect(() => {
    const lens = camera as PerspectiveCamera
    const halfFov = Math.tan((lens.fov * Math.PI) / 360)
    const width = companions ? 4.8 : 2
    const height = hat ? 3.3 : 2
    const center = hat ? -0.2 : -0.8
    const distance =
      Math.max(
        height / (2 * halfFov),
        width / (2 * halfFov * (size.width / size.height))
      ) * 1.1
    camera.position.set(0, center, distance)
    const orbit = controls as ComponentRef<typeof OrbitControls> | null
    orbit?.target.set(0, center, 0)
    orbit?.update()
  }, [camera, controls, companions, hat, size.width, size.height])
  return null
}

/** The large avatar stage: the current body, look, ride, and pet. */
export function WardrobeStage({
  body,
  look,
}: {
  body: AvatarBody
  look: Look
}) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null)
  const vehicle = look.vehicle
  const pet = look.pet
  const petModel = pet ? UNLOCKS[pet]?.model : undefined
  return (
    <section className="wardrobe-stage">
      <ViewSlot className="wardrobe-stage-view">
        <AvatarLights />
        <OrbitControls
          ref={controls}
          makeDefault
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 2}
          maxPolarAngle={Math.PI / 2}
          rotateSpeed={0.8}
        />
        <PreviewCamera
          companions={Boolean(vehicle || petModel)}
          hat={Boolean(look.hat)}
        />
        <group position={[0, 0, 0]}>
          <AvatarTurntable body={body} look={look} spin={0} />
          {vehicle && (
            <group position={[-1.5, -1.6, -0.4]} scale={0.65}>
              <PersonalVehicle id={vehicle} />
            </group>
          )}
          {petModel && (
            <group position={[1.3, -1.6, 0]} scale={0.6}>
              <Model path={petModel} shadow={false} />
            </group>
          )}
        </group>
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

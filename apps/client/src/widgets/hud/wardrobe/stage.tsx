import type { AvatarBody, Look } from '@saigon/shared'
import { UNLOCKS } from '@saigon/shared'
import {
  AvatarLights,
  AvatarTurntable,
  Model,
  PersonalVehicle,
} from '@/shared/world'
import { ViewSlot } from './view-slot'

/** The large avatar stage: the current body, look, ride, and pet. */
export function WardrobeStage({
  body,
  look,
}: {
  body: AvatarBody
  look: Look
}) {
  const vehicle = look.vehicle
  const pet = look.pet
  const petModel = pet ? UNLOCKS[pet]?.model : undefined
  return (
    <div className="wardrobe-stage">
      <ViewSlot className="wardrobe-stage-view">
        <AvatarLights />
        <group position={[0, 0, 0]}>
          <AvatarTurntable body={body} look={look} spin={0.3} />
          {vehicle && (
            <group position={[0, -1.6, 0]} scale={0.9}>
              <PersonalVehicle id={vehicle} />
            </group>
          )}
          {petModel && (
            <group position={[1.1, -1.6, 0]} scale={1.2}>
              <Model path={petModel} shadow={false} />
            </group>
          )}
        </group>
      </ViewSlot>
    </div>
  )
}

import type { AvatarBody, Look } from '@saigon/shared'
import { AVATAR_BODIES, UNLOCKS } from '@saigon/shared'
import { saveProfile } from '@/shared/api/session'
import { m } from '@/shared/i18n'
import { game, notify, update } from '@/shared/state/game'
import {
  AvatarLights,
  AvatarTurntable,
  Model,
  PersonalVehicle,
} from '@/shared/world'
import { ViewSlot } from './view-slot'

/** Change the body from the wardrobe; identity persists like the name. */
async function chooseBody(body: AvatarBody) {
  if (body === game.state.body) return
  update({ body })
  if (game.state.guestStatus !== 'online') return
  try {
    await saveProfile(game.state.guestName ?? '', body)
  } catch {
    notify(m.toast_name_not_saved())
  }
}

/** The large avatar stage: the current body, look, ride, pet, and a body toggle. */
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
      <div className="wardrobe-body">
        <span className="wardrobe-body-label">{m.wardrobe_body()}</span>
        {AVATAR_BODIES.map((option) => (
          <button
            key={option}
            type="button"
            className={`wardrobe-body-option${body === option ? ' is-active' : ''}`}
            aria-pressed={body === option}
            onClick={() => chooseBody(option)}
          >
            {option === 'man' ? m.body_man() : m.body_woman()}
          </button>
        ))}
      </div>
    </div>
  )
}

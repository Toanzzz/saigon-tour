import { FRAGILE_ITEM_IDS, type FragileItemId } from '@saigon/shared'
import { motion } from '@/shared/runtime/motion'
import { type GameState, game, notify } from '@/shared/state/game'
import { nextStep } from '@/shared/state/quests'
import { isXRPresenting } from '@/shared/xr/store'
import { type AsideKind, asideFor } from './lines'
import { commitCarry } from './store'
import { impulseFrom, newWobble, step } from './wobble'

/**
 * Is `id` a fragile item? Narrows to `FragileItemId` for the renderers.
 */
function isFragile(id: string): id is FragileItemId {
  return (FRAGILE_ITEM_IDS as readonly string[]).includes(id)
}

/**
 * The fragile item the player is actively carrying for a quest: the next
 * unfinished DELIVER/BRING step of an active quest whose item is fragile and
 * in the bag. `null` when there is nothing to wobble.
 */
export function carriedFragile(
  state: GameState = game.state
): FragileItemId | null {
  for (const quest of state.quests) {
    if (quest.status !== 'active' && quest.status !== 'ready') continue
    const stepValue = nextStep(quest)
    if (!stepValue) continue
    if (stepValue.type !== 'DELIVER' && stepValue.type !== 'BRING') continue
    if (!isFragile(stepValue.itemId)) continue
    if ((state.world.inventory[stepValue.itemId] ?? 0) > 0)
      return stepValue.itemId
  }
  return null
}

/**
 * Live wobble shared by the player avatar and the transport rider. The spring
 * is mutable and read every frame; only the React-visible care level and
 * asides reach the store, through a throttled `commitCarry`.
 */
const wobble = newWobble()
export const readWobbleAngle = () => wobble.angle

let prevSprinting = motion.sprinting
let prevHeading = motion.heading
let lastAsideAt = -Infinity
/** At most one narrator aside per 8 s. */
const ASIDE_GAP_SECONDS = 8

/** Reset the frame-local history so a new carry starts clean. */
export function resetCarryRuntime() {
  wobble.angle = 0
  wobble.velocity = 0
  prevSprinting = motion.sprinting
  prevHeading = motion.heading
  lastAsideAt = -Infinity
}

/** Clock (s) for throttling asides; frame-driven, monotonic within a carry. */
let clock = 0

/**
 * Advance the wobble by one frame while carrying a fragile deliverable on
 * foot. Sprint toggles and sharp turns add impulses; a settled cake decays
 * toward upright. Call from the player frame loop.
 */
export function stepFootCarry(dt: number, carrying: boolean) {
  clock += dt
  if (!carrying) return
  let impulse = 0
  let kind: AsideKind | null = null
  if (motion.sprinting !== prevSprinting) {
    impulse += impulseFrom(2.5, 0)
    kind = motion.sprinting ? 'sprint' : 'stop'
  }
  if (motion.moving) {
    let dHeading = motion.heading - prevHeading
    while (dHeading > Math.PI) dHeading -= Math.PI * 2
    while (dHeading < -Math.PI) dHeading += Math.PI * 2
    if (Math.abs(dHeading) > 0.25) {
      impulse += impulseFrom(0, dHeading)
      if (!kind) kind = 'turn'
    }
  }
  prevSprinting = motion.sprinting
  prevHeading = motion.heading
  applyStep(dt, impulse, kind)
}

/**
 * Advance the wobble for a transport corner. Smooth modes pass `impulse = 0`;
 * xe ôm corners pass a non-zero turn impulse. Call from the transport loop.
 */
export function stepRideCarry(
  dt: number,
  carrying: boolean,
  cornerImpulse: number
) {
  clock += dt
  if (!carrying) return
  applyStep(dt, cornerImpulse, cornerImpulse > 0 ? 'corner' : null)
}

function applyStep(dt: number, impulse: number, kind: AsideKind | null) {
  const next = step(wobble, dt, impulse)
  wobble.angle = next.angle
  wobble.velocity = next.velocity
  let aside: string | null = null
  if (kind && clock - lastAsideAt >= ASIDE_GAP_SECONDS) {
    lastAsideAt = clock
    aside = asideFor(kind)
    // XR has no 3D prop; the aside still surfaces as a toast.
    if (isXRPresenting()) notify(aside)
  }
  commitCarry(wobble.angle, aside)
}

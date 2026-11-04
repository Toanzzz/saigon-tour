import { staminaModifiers, type WorldState } from '@saigon/shared'
import { Store } from '@tanstack/store'

interface StaminaView {
  current: number
  max: number
  exhausted: boolean
  usedAt: number
  now: number
}
const initial = (): StaminaView => ({
  current: 100,
  max: 100,
  exhausted: false,
  usedAt: 0,
  now: Date.now(),
})
export const stamina = new Store<StaminaView>(initial())
const runtime = {
  current: 100,
  exhausted: false,
  recovery: 0,
  publish: 0,
  started: false,
}
const receipts = new Set<string>()
export const canSprint = () => !runtime.exhausted && runtime.current > 0

export function resetStamina() {
  Object.assign(runtime, {
    current: 100,
    exhausted: false,
    recovery: 0,
    publish: 0,
    started: false,
  })
  receipts.clear()
  stamina.setState(initial)
}

/** Frame simulation remains mutable; the HUD receives at most ten writes/s. */
export function stepStamina(
  delta: number,
  sprinting: boolean,
  effects: WorldState['effects'],
  active = true,
  now = Date.now()
) {
  const modifiers = staminaModifiers(effects, now)
  const dt = Math.min(Math.max(delta, 0), 0.1)
  runtime.current = Math.min(runtime.current, modifiers.max)
  if (active) {
    if (!runtime.started) {
      runtime.current = modifiers.max
      runtime.started = true
    }
    if (sprinting && canSprint()) {
      runtime.current = Math.max(0, runtime.current - modifiers.drain * dt)
      runtime.recovery = 1.5
      if (runtime.current <= 0.0001) {
        runtime.current = 0
        runtime.exhausted = true
      }
    } else {
      const recovering = Math.max(0, dt - runtime.recovery)
      runtime.recovery = Math.max(0, runtime.recovery - dt)
      runtime.current = Math.min(
        modifiers.max,
        runtime.current + modifiers.regen * recovering
      )
    }
    if (runtime.exhausted && runtime.current >= 25) runtime.exhausted = false
  }
  runtime.publish += dt
  if (
    runtime.publish >= 0.1 ||
    stamina.state.exhausted !== runtime.exhausted ||
    stamina.state.max !== modifiers.max
  ) {
    runtime.publish = 0
    const current = Math.round(runtime.current * 10) / 10
    if (
      current !== stamina.state.current ||
      modifiers.max !== stamina.state.max ||
      runtime.exhausted !== stamina.state.exhausted ||
      Math.floor(now / 1000) !== Math.floor(stamina.state.now / 1000)
    )
      stamina.setState((state) => ({
        ...state,
        current,
        max: modifiers.max,
        exhausted: runtime.exhausted,
        now,
      }))
  }
}

export function restoreStamina(
  requestId: string,
  amount: number,
  effects: WorldState['effects'],
  now = Date.now()
) {
  if (receipts.has(requestId)) return
  receipts.add(requestId)
  runtime.started = true
  const { max } = staminaModifiers(effects, now)
  runtime.current = Math.min(max, runtime.current + amount)
  if (runtime.current >= 25) runtime.exhausted = false
  stamina.setState((state) => ({
    ...state,
    current: runtime.current,
    max,
    exhausted: runtime.exhausted,
    usedAt: now,
    now,
  }))
}

import { describe, expect, it } from 'vitest'
import {
  canSprint,
  resetStamina,
  restoreStamina,
  stamina,
  stepStamina,
} from '@/features/stamina'

const run = (seconds: number, sprinting = true, active = true) => {
  for (let frame = 0; frame < seconds * 60; frame++)
    stepStamina(1 / 60, sprinting, [], active, 1000 + (frame * 1000) / 60)
}

describe('sprint stamina', () => {
  it('allows twelve seconds, then requires recovery to 25 before sprinting', () => {
    run(12)
    expect(stamina.state.current).toBe(0)
    expect(canSprint()).toBe(false)
    run(1.5, false)
    expect(canSprint()).toBe(false)
    run(1.9, false)
    expect(canSprint()).toBe(false)
    run(0.2, false)
    expect(canSprint()).toBe(true)
    expect(stamina.state.current).toBeGreaterThanOrEqual(25)
  })

  it('freezes on pause and recovers in non-sprinting conversation/ride time', () => {
    run(6)
    expect(stamina.state.current).toBeCloseTo(50, 0)
    run(20, true, false)
    expect(stamina.state.current).toBeCloseTo(50, 0)
    run(6, false)
    expect(stamina.state.current).toBe(100)
  })

  it('halves drain with coffee and independently expands capacity with phở', () => {
    const effects = [
      { itemId: 'coffee' as const, endsAt: 181000 },
      { itemId: 'pho' as const, endsAt: 181000 },
    ]
    restoreStamina('pho', 50, effects, 1000)
    expect(stamina.state.current).toBe(150)
    for (let frame = 0; frame < 720; frame++)
      stepStamina(1 / 60, true, effects, true, 1000)
    expect(stamina.state.current).toBeCloseTo(100, 0)
    expect(canSprint()).toBe(true)
    stepStamina(0.1, false, effects, false, 182000)
    expect(stamina.state.max).toBe(100)
    expect(stamina.state.current).toBeLessThanOrEqual(100)
  })

  it('restores from a server receipt once and retains state across ordinary saves', () => {
    run(6)
    restoreStamina('banana', 40, [], 1000)
    expect(stamina.state.current).toBeCloseTo(90, 0)
    restoreStamina('banana', 40, [], 1000)
    expect(stamina.state.current).toBeCloseTo(90, 0)
    resetStamina()
    expect(stamina.state.current).toBe(100)
  })

  it('uses bread recovery after the same delay without raising the maximum', () => {
    run(6)
    const effects = [{ itemId: 'baguette' as const, endsAt: 181000 }]
    for (let frame = 0; frame < 210; frame++)
      stepStamina(1 / 60, false, effects, true, 1000)
    stepStamina(0.1, false, effects, false, 1000)
    expect(stamina.state.current).toBeCloseTo(87.5, 0)
    expect(stamina.state.max).toBe(100)
  })

  it('starts full at the loaded capacity on first play without refilling on later saves', () => {
    const effects = [{ itemId: 'pho' as const, endsAt: 181000 }]
    stepStamina(0.1, false, [], false, 1000)
    stepStamina(0.1, false, effects, false, 1000)
    stepStamina(0.1, false, effects, true, 1000)
    expect(stamina.state.current).toBe(150)
    for (let frame = 0; frame < 60; frame++)
      stepStamina(1 / 60, true, effects, true, 1000)
    const afterSprint = stamina.state.current
    stepStamina(0.1, false, effects, false, 1000)
    expect(stamina.state.current).toBeLessThanOrEqual(afterSprint)
  })

  it('does not initialize a second time after an early food receipt', () => {
    restoreStamina('banana', 40, [], 1000)
    stepStamina(0.1, false, [{ itemId: 'pho', endsAt: 181000 }], true, 1000)
    expect(stamina.state.current).toBeLessThan(150)
  })
})

import { describe, expect, it } from 'vitest'
import { carryStore, commitCarry, resetCarry } from '@/features/carry/store'
import {
  careFor,
  impulseFrom,
  LANDSCAPE_THRESHOLD,
  newWobble,
  step,
  WOBBLY_THRESHOLD,
} from '@/features/carry/wobble'

describe('careFor thresholds', () => {
  it('stays pristine below the wobbly threshold', () => {
    expect(careFor(0)).toBe('pristine')
    expect(careFor(WOBBLY_THRESHOLD - 0.01)).toBe('pristine')
  })
  it('is wobbly between the two thresholds', () => {
    expect(careFor(WOBBLY_THRESHOLD)).toBe('wobbly')
    expect(careFor(LANDSCAPE_THRESHOLD - 0.01)).toBe('wobbly')
  })
  it('is landscape at or above the landscape threshold', () => {
    expect(careFor(LANDSCAPE_THRESHOLD)).toBe('landscape')
    expect(careFor(2)).toBe('landscape')
  })
  it('ignores the sign of the peak', () => {
    expect(careFor(-LANDSCAPE_THRESHOLD)).toBe('landscape')
    expect(careFor(-WOBBLY_THRESHOLD)).toBe('wobbly')
  })
})

describe('impulseFrom', () => {
  it('grows with speed and heading change', () => {
    expect(impulseFrom(0, 0)).toBe(0)
    expect(impulseFrom(1, 0)).toBeGreaterThan(0)
    expect(impulseFrom(0, 1)).toBeGreaterThan(0)
    expect(impulseFrom(2, 1)).toBeGreaterThan(impulseFrom(1, 1))
  })
  it('clamps the heading contribution to half a turn', () => {
    expect(impulseFrom(0, Math.PI)).toBeCloseTo(impulseFrom(0, 10))
  })
})

describe('spring decay', () => {
  it('decays an impulse back toward upright', () => {
    let state = step(newWobble(), 1 / 60, 1.5)
    const peak = Math.abs(state.angle)
    expect(peak).toBeGreaterThan(0)
    for (let i = 0; i < 300; i++) state = step(state, 1 / 60)
    expect(Math.abs(state.angle)).toBeLessThan(0.001)
    expect(Math.abs(state.velocity)).toBeLessThan(0.001)
  })
  it('a level, still cake stays at zero', () => {
    const state = step(newWobble(), 1 / 60)
    expect(state.angle).toBe(0)
    expect(state.velocity).toBe(0)
  })
})

describe('carryStore stickiness and reset', () => {
  it('starts pristine', () => {
    resetCarry()
    expect(carryStore.state).toEqual({ care: 'pristine', aside: null, peak: 0 })
  })
  it('climbs with the peak and never drops back down', () => {
    resetCarry()
    commitCarry(WOBBLY_THRESHOLD + 0.05, null)
    expect(carryStore.state.care).toBe('wobbly')
    commitCarry(LANDSCAPE_THRESHOLD + 0.1, null)
    expect(carryStore.state.care).toBe('landscape')
    // A later calm frame must not un-squash the cake.
    commitCarry(0, null)
    expect(carryStore.state.care).toBe('landscape')
    expect(carryStore.state.peak).toBeGreaterThanOrEqual(LANDSCAPE_THRESHOLD)
  })
  it('keeps the latest aside and tracks the max peak', () => {
    resetCarry()
    commitCarry(0.1, 'first')
    expect(carryStore.state.aside).toBe('first')
    commitCarry(0.05, 'second')
    expect(carryStore.state.aside).toBe('second')
    expect(carryStore.state.peak).toBeCloseTo(0.1)
  })
  it('resetCarry clears a squashed cake', () => {
    commitCarry(LANDSCAPE_THRESHOLD + 0.2, 'later')
    resetCarry()
    expect(carryStore.state).toEqual({ care: 'pristine', aside: null, peak: 0 })
  })
})

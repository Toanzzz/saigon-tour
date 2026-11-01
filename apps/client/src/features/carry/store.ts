import { Store } from '@tanstack/store'
import { type CareLevel, careFor } from './wobble'

/**
 * React-visible state for the fragile-parcel gag. The frame driver keeps the
 * raw spring mutable and only writes here on change, through `commitCarry`,
 * so the subscriber list is never spammed by the per-frame loop.
 *
 * `care` is sticky: it tracks the highest peak reached during a carry, so the
 * cake never un-squashes. `resetCarry` clears it for a new carry or a restart.
 */
export interface CarryState {
  care: CareLevel
  aside: string | null
  peak: number
}

const PRISTINE: CarryState = { care: 'pristine', aside: null, peak: 0 }

export const carryStore = new Store<CarryState>({ ...PRISTINE })

/** Highest peak reached this carry, tracked outside the store so the frame
 * loop can accumulate it without writing to subscribers every tick. */
let peak = 0

export function resetCarry() {
  peak = 0
  carryStore.setState(() => ({ ...PRISTINE }))
}

/**
 * Fold a new peak and optional aside into the store. `peak` climbs
 * monotonically (sticky care), but the store is only rewritten when the
 * React-visible fields — `care` or `aside` — actually change.
 */
export function commitCarry(nextPeak: number, aside: string | null) {
  peak = Math.max(peak, Math.abs(nextPeak))
  const prev = carryStore.state
  const care = careFor(peak)
  const nextAside = aside ?? prev.aside
  if (care === prev.care && nextAside === prev.aside && peak === prev.peak)
    return
  carryStore.setState(() => ({ care, aside: nextAside, peak }))
}

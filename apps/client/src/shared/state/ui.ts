import type { UnlockSlot } from '@saigon/shared'
import { Store } from '@tanstack/store'
import type { PLACES, TravelMode } from '@/shared/world/places'

/**
 * Transient UI drafts and toggles. These live module-level (not in the game
 * save) so they survive the locale remount of `GameUI` (app/app.tsx), and are
 * reset explicitly: journey-scoped ones in `restart()` (app/actions.ts) and all
 * of them in the test `beforeEach`. Seeding on panel/screen transitions happens
 * once in `installUiResets()` (shared/state/ui-resets.ts), not on every mount.
 */

// --- Name draft (title + pause rename) ---------------------------------------
export const nameDraft = new Store({ name: '' })
export const setNameDraft = (name: string) =>
  nameDraft.setState(() => ({ name }))
export const seedNameDraft = (name: string | null) =>
  nameDraft.setState(() => ({ name: name ?? '' }))
export const resetNameDraft = () => nameDraft.setState(() => ({ name: '' }))

// --- Two-tap "New journey" confirm -------------------------------------------
export const journeyConfirm = new Store({ armed: false })
let journeyTimer: ReturnType<typeof setTimeout> | undefined
/** Arm the confirm and auto-disarm after 4 s unless pressed again first. */
export function armJourneyConfirm() {
  clearTimeout(journeyTimer)
  journeyConfirm.setState(() => ({ armed: true }))
  journeyTimer = setTimeout(() => {
    journeyConfirm.setState(() => ({ armed: false }))
  }, 4000)
}
export function disarmJourneyConfirm() {
  clearTimeout(journeyTimer)
  journeyConfirm.setState(() => ({ armed: false }))
}
export const resetJourneyConfirm = disarmJourneyConfirm

// --- Transport form (mode + destination) -------------------------------------
export interface TransportForm {
  mode: TravelMode
  destination: keyof typeof PLACES
}
export const transportForm = new Store<TransportForm>({
  mode: 'bus',
  destination: 'park',
})
export const setTransportMode = (mode: TravelMode) =>
  transportForm.setState((form) => ({ ...form, mode }))
export const setTransportDestination = (destination: keyof typeof PLACES) =>
  transportForm.setState((form) => ({ ...form, destination }))
/** Seed the form when the transport panel opens: bus, away from the current stop. */
export const seedTransportForm = (stop: keyof typeof PLACES) =>
  transportForm.setState(() => ({
    mode: 'bus',
    destination: stop === 'park' ? 'market' : 'park',
  }))
export const resetTransportForm = () =>
  transportForm.setState(() => ({ mode: 'bus', destination: 'park' }))

// --- Chat draft (text + earlier-history toggle) ------------------------------
export const chatDraft = new Store({ text: '', showEarlier: false })
export const setChatText = (text: string) =>
  chatDraft.setState((draft) => ({ ...draft, text }))
export const setChatShowEarlier = (showEarlier: boolean) =>
  chatDraft.setState((draft) => ({ ...draft, showEarlier }))
export const toggleChatShowEarlier = () =>
  chatDraft.setState((draft) => ({ ...draft, showEarlier: !draft.showEarlier }))
/** Clear the composer and collapse earlier history (NPC switch or new chat). */
export const resetChatDraft = () =>
  chatDraft.setState(() => ({ text: '', showEarlier: false }))

// --- Wardrobe slot tab -------------------------------------------------------
export const wardrobeTab = new Store<{ slot: UnlockSlot }>({ slot: 'hat' })
export const setWardrobeTab = (slot: UnlockSlot) =>
  wardrobeTab.setState(() => ({ slot }))
export const resetWardrobeTab = () =>
  wardrobeTab.setState(() => ({ slot: 'hat' }))

// --- Shared 1 s clock (waiting notice, riddle countdown) ---------------------
export const clock = new Store({ now: Date.now() })
let clockTimer: ReturnType<typeof setInterval> | undefined
// Reference count so independent holders (waiting notice, riddle countdown)
// can start and stop the tick without cutting each other off.
let clockHolds = 0
export function startClock() {
  clockHolds += 1
  if (clockTimer) return
  clock.setState(() => ({ now: Date.now() }))
  clockTimer = setInterval(() => {
    clock.setState(() => ({ now: Date.now() }))
  }, 1000)
}
export function stopClock() {
  clockHolds = Math.max(0, clockHolds - 1)
  if (clockHolds > 0 || !clockTimer) return
  clearInterval(clockTimer)
  clockTimer = undefined
}
export const resetClock = () => {
  clockHolds = 0
  if (clockTimer) {
    clearInterval(clockTimer)
    clockTimer = undefined
  }
  clock.setState(() => ({ now: Date.now() }))
}

/** Reset every transient UI store. Journey-scoped ones also reset in restart(). */
export function resetUiStores() {
  resetNameDraft()
  resetJourneyConfirm()
  resetTransportForm()
  resetChatDraft()
  resetWardrobeTab()
  resetClock()
}

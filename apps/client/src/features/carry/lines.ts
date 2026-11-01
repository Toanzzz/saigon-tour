import { m } from '@/shared/i18n'
import type { CareLevel } from './wobble'

/**
 * Narrator asides and recipient reactions for the fragile-parcel gag. Never
 * call `m.*()` at module scope: Paraglide needs the active locale, so these
 * stay as functions evaluated at runtime.
 */

/** What triggered a wobble, so the aside can match the player's action. */
export type AsideKind = 'sprint' | 'stop' | 'turn' | 'corner'

export function asideFor(kind: AsideKind): string {
  switch (kind) {
    case 'sprint':
      return m.carry_aside_sprint()
    case 'stop':
      return m.carry_aside_stop()
    case 'turn':
      return m.carry_aside_turn()
    case 'corner':
      return m.carry_aside_corner()
  }
}

/** The recipient's one-line reaction, picked by the care level on delivery. */
export function reactionFor(care: CareLevel): string {
  switch (care) {
    case 'pristine':
      return m.carry_react_pristine()
    case 'wobbly':
      return m.carry_react_wobbly()
    case 'landscape':
      return m.carry_react_landscape()
  }
}

/**
 * A short, locale-aware phrase describing the care level, embedded in the
 * delivery prompt so a live NPC can react in its own voice.
 */
export function carePhrase(care: CareLevel): string {
  switch (care) {
    case 'pristine':
      return m.carry_care_pristine()
    case 'wobbly':
      return m.carry_care_wobbly()
    case 'landscape':
      return m.carry_care_landscape()
  }
}

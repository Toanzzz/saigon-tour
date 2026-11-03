import { questRouteLegs } from './route'
import type { Quest } from './schema'

const BONUS = 5
const LONG_LEG = 70
const FARE_PER_LONG_LEG = 3

/**
 * Par fare for a quest: 3 coins for each leg longer than 70 units along the
 * actual route giver home → each step → home.
 */
export function parFare(quest: Quest): number {
  return questRouteLegs(quest).reduce(
    (fare, distance) => fare + (distance > LONG_LEG ? FARE_PER_LONG_LEG : 0),
    0
  )
}

export interface CompletionBonus {
  thrifty?: number
  sharp?: number
}

/** Thrifty (+5 spent ≤ par) and sharp-eye (+5 solved) bonuses. */
export function completionBonus(quest: Quest): CompletionBonus {
  const bonus: CompletionBonus = {}
  if ((quest.spent ?? 0) <= parFare(quest)) bonus.thrifty = BONUS
  if (quest.revealed === 'solved') bonus.sharp = BONUS
  return bonus
}

/** Total currency delta from a completion bonus. */
export function bonusCurrency(bonus: CompletionBonus): number {
  return (bonus.thrifty ?? 0) + (bonus.sharp ?? 0)
}

import { QUEST_DOMAINS, QUEST_LOCATION_POSITIONS } from './domains'
import type { Quest, QuestStep } from './schema'

const BONUS = 5
const LONG_LEG = 70
const FARE_PER_LONG_LEG = 3

function stepLocation(step: QuestStep): keyof typeof QUEST_LOCATION_POSITIONS {
  return step.type === 'GO_TO'
    ? step.locationId
    : step.type === 'BUY'
      ? 'market'
      : QUEST_DOMAINS[step.npcId].home
}

/**
 * Par fare for a quest: 3 coins for each leg longer than 70 units along the
 * route giver home → each step → home. Matches `rewardFor`'s leg rule.
 */
export function parFare(quest: Quest): number {
  const home = QUEST_LOCATION_POSITIONS[QUEST_DOMAINS[quest.giverNpcId].home]
  const points = [
    home,
    ...quest.steps.map((step) => QUEST_LOCATION_POSITIONS[stepLocation(step)]),
    home,
  ]
  let fare = 0
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    if (!a || !b) continue
    if (Math.hypot(a[0] - b[0], a[1] - b[1]) > LONG_LEG)
      fare += FARE_PER_LONG_LEG
  }
  return fare
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

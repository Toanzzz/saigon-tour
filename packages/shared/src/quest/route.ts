import { QUEST_DOMAINS, QUEST_LOCATION_POSITIONS } from './domains'
import type { QuestSpec, QuestStep } from './schema'

type RouteQuest = Pick<QuestSpec, 'giverNpcId' | 'steps' | 'twist'>

function stepPosition(step: QuestStep) {
  const location =
    step.type === 'GO_TO'
      ? step.locationId
      : step.type === 'BUY'
        ? 'market'
        : QUEST_DOMAINS[step.npcId].home
  return QUEST_LOCATION_POSITIONS[location]
}

/** Consecutive travel legs, including the return to the giver. */
export function questRouteLegs(
  quest: Pick<QuestSpec, 'giverNpcId' | 'steps'>
): number[] {
  const home = QUEST_LOCATION_POSITIONS[QUEST_DOMAINS[quest.giverNpcId].home]
  const points = [home, ...quest.steps.map(stepPosition), home]
  return points.slice(1).map((point, index) => {
    const previous = points[index]
    return Math.hypot(point[0] - previous[0], point[1] - previous[1])
  })
}

function routeVariants(quest: RouteQuest): QuestStep[][] {
  if (!quest.twist) return [quest.steps]
  const original = [...quest.steps]
  const alternative = [...quest.steps]
  const last = original.length - 1
  if (last < 0) return [quest.steps]
  if (quest.twist.replaced) original[last] = quest.twist.replaced
  alternative[last] = quest.twist.step
  return [original, alternative]
}

/** The promised route pays for the longer original or twisted ending. */
export function questRouteDistance(quest: RouteQuest): number {
  return Math.max(
    ...routeVariants(quest).map((steps) =>
      questRouteLegs({ ...quest, steps }).reduce((sum, leg) => sum + leg, 0)
    )
  )
}

/** Required shopping is covered even when a twist changes the final purchase. */
export function questPurchaseCost(quest: RouteQuest): number {
  return Math.max(
    ...routeVariants(quest).map((steps) =>
      steps.reduce(
        (sum, step) =>
          sum +
          (step.type === 'BUY' ? MARKET_ITEMS[step.marketItemId].price : 0),
        0
      )
    )
  )
}

import { MARKET_ITEMS } from '../entities'

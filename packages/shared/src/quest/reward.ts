import { type Reward, RewardSchema } from '../entities'
import { isMilestoneFinale } from '../milestones'
import { selectUnlock, type UnlockId } from '../unlocks'
import { QUEST_DOMAINS } from './domains'
import { questPurchaseCost, questRouteDistance } from './route'
import type { QuestSpec } from './schema'

/** The player's ownership, outstanding promises, and affinity with the giver. */
export interface UnlockContext {
  owned: readonly UnlockId[]
  promised: readonly UnlockId[]
  friendship: number
}

const NEIGHBOR_GIVERS = new Set([
  'hoa',
  'tam',
  'linh',
  'ba',
  'mai',
  'alex',
  'vy',
  'son',
  'thao',
])

/** A new offer's deterministic promise; completion never recalculates it. */
export function rewardFor(spec: QuestSpec, unlocks?: UnlockContext): Reward {
  const domain = QUEST_DOMAINS[spec.giverNpcId]
  const purchases = questPurchaseCost(spec)
  const finale = isMilestoneFinale(spec)
  const unlockId =
    unlocks && NEIGHBOR_GIVERS.has(spec.giverNpcId)
      ? selectUnlock(
          spec.giverNpcId as Parameters<typeof selectUnlock>[0],
          unlocks
        )
      : undefined
  return RewardSchema.parse({
    currency: finale
      ? 90
      : Math.min(
          90,
          20 +
            spec.steps.length * 10 +
            Math.ceil(questRouteDistance(spec) / 10) +
            purchases +
            (spec.twist ? 5 : 0) +
            (spec.riddle ? 5 : 0)
        ),
    itemId: spec.gift ?? domain.gifts[0] ?? null,
    reputation: finale ? 5 : Math.min(3, spec.steps.length),
    ...(unlockId ? { unlockId } : {}),
  })
}

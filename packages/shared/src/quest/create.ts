import { rewardFor, type UnlockContext } from './reward'
import type { Quest, QuestSpec } from './schema'

export function createQuest(
  spec: QuestSpec,
  id = `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`,
  now = Date.now(),
  unlocks?: UnlockContext
): Quest {
  return {
    ...spec,
    steps: spec.steps.map((step) => ({ ...step })),
    id,
    reward: rewardFor(spec, unlocks),
    progress: spec.steps.map(() => false),
    status: 'active',
    createdAt: now,
  }
}

export function isReady(quest: Quest): boolean {
  return (
    quest.progress.length === quest.steps.length &&
    quest.progress.every(Boolean)
  )
}
